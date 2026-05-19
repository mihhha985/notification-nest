import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { RabbitMqService } from '../src/rabbitmq/rabbitmq.service';
import {
  missingPayloadErrorExample,
  sendMessageBodyExamples,
} from '../src/messages/messages.swagger';

const publishSuccessResult = {
  messageId: 'test-message-id',
  exchange: 'notifications',
  routingKey: 'telegram.notify',
  confirmed: true,
};

describe('MessagesController (e2e)', () => {
  let app: INestApplication;
  let publishMock: jest.Mock;

  beforeEach(async () => {
    publishMock = jest.fn().mockResolvedValue(publishSuccessResult);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RabbitMqService)
      .useValue({
        onModuleInit: jest.fn().mockResolvedValue(undefined),
        onModuleDestroy: jest.fn().mockResolvedValue(undefined),
        publish: publishMock,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /messages', () => {
    it('returns 200 and Hello World!', () => {
      return request(app.getHttpServer())
        .get('/messages')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('POST /messages', () => {
    it('returns 202 with PublishResult for telegram body (Swagger example)', async () => {
      const body = sendMessageBodyExamples.telegram.value;

      const response = await request(app.getHttpServer())
        .post('/messages')
        .send(body)
        .expect(202);

      expect(response.body).toEqual(publishSuccessResult);
      expect(publishMock).toHaveBeenCalledTimes(1);
      expect(publishMock).toHaveBeenCalledWith(
        body.type,
        { chatId: body.telegram.chatId, text: body.telegram.text },
        undefined,
      );
    });

    it('returns 202 with PublishResult for generic payload (Swagger example)', async () => {
      const body = sendMessageBodyExamples.genericPayload.value;

      const response = await request(app.getHttpServer())
        .post('/messages')
        .send(body)
        .expect(202);

      expect(response.body).toEqual(publishSuccessResult);
      expect(publishMock).toHaveBeenCalledWith(
        body.type,
        body.payload,
        body.messageId,
      );
    });

    it('returns 400 when telegram and payload are both missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/messages')
        .send({ type: 'telegram' })
        .expect(400);

      expect(response.body).toEqual({
        statusCode: missingPayloadErrorExample.statusCode,
        message: missingPayloadErrorExample.message,
        error: missingPayloadErrorExample.error,
      });
      expect(publishMock).not.toHaveBeenCalled();
    });

    it('returns 400 for validation errors (empty type, unknown field)', async () => {
      const response = await request(app.getHttpServer())
        .post('/messages')
        .send({
          type: '',
          unknownField: true,
          telegram: { chatId: '1', text: 'hi' },
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'type should not be empty',
          'property unknownField should not exist',
        ]),
      );
      expect(publishMock).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid messageId (not UUID v4)', async () => {
      const response = await request(app.getHttpServer())
        .post('/messages')
        .send({
          type: 'telegram',
          messageId: 'not-a-uuid',
          telegram: { chatId: '123', text: 'test' },
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toEqual(
        expect.arrayContaining(['messageId must be a UUID']),
      );
      expect(publishMock).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid nested telegram fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/messages')
        .send({
          type: 'telegram',
          telegram: { chatId: '', text: '' },
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          'telegram.chatId should not be empty',
          'telegram.text should not be empty',
        ]),
      );
      expect(publishMock).not.toHaveBeenCalled();
    });

    it('returns 500 when RabbitMQ publish fails', async () => {
      publishMock.mockRejectedValue(new Error('RabbitMQ unavailable'));

      const response = await request(app.getHttpServer())
        .post('/messages')
        .send(sendMessageBodyExamples.telegram.value)
        .expect(500);

      expect(response.body.statusCode).toBe(500);
      expect(response.body.message).toMatch(/internal server error/i);
    });
  });
});
