import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RabbitMqService } from '../rabbitmq/rabbitmq.service';
import { PublishResult } from '../rabbitmq/interfaces/message.interface';
import { SendMessageDto } from './messages.dto';
import { PublishResultDto } from './publish-result.dto';
import {
  HttpErrorResponseDto,
  internalErrorExample,
  missingPayloadErrorExample,
  sendMessageBodyExamples,
  validationErrorExample,
} from './messages.swagger';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly rabbitMqService: RabbitMqService) {}

	@Get()
	@HttpCode(HttpStatus.OK)
	async sendHelloWorld(): Promise<string> {
		return 'Hello World!';
	}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Опубликовать уведомление в RabbitMQ',
    description:
      'Принимает тип уведомления и данные (telegram или произвольный payload), ' +
      'формирует сообщение и публикует его в exchange с publisher confirm. ' +
      'При успехе возвращает 202 Accepted.',
  })
  @ApiBody({
    type: SendMessageDto,
    examples: sendMessageBodyExamples,
  })
  @ApiAcceptedResponse({
    description:
      'Сообщение принято и подтверждено брокером RabbitMQ (publisher confirm)',
    type: PublishResultDto,
  })
  @ApiBadRequestResponse({
    description:
      'Некорректное тело запроса: ошибки валидации (class-validator), ' +
      'неизвестные поля (forbidNonWhitelisted) или отсутствуют и telegram, и payload',
    type: HttpErrorResponseDto,
    content: {
      'application/json': {
        examples: {
          validation: {
            summary: 'Ошибки валидации полей',
            value: validationErrorExample,
          },
          missingPayload: {
            summary: 'Не указан telegram и payload',
            value: missingPayloadErrorExample,
          },
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description:
      'Не удалось опубликовать сообщение после повторных попыток (RabbitMQ недоступен, буфер переполнен и т.п.)',
    schema: {
      example: internalErrorExample,
    },
  })
  async send(@Body() dto: SendMessageDto): Promise<PublishResult> {
    const payload = this.resolvePayload(dto);

    return this.rabbitMqService.publish(dto.type, payload, dto.messageId);
  }

  private resolvePayload(
    dto: SendMessageDto,
  ): Record<string, unknown> {
    if (dto.telegram) {
      return { ...dto.telegram };
    }

    if (dto.payload) {
      return dto.payload;
    }

    throw new BadRequestException(
      'Either "telegram" or "payload" must be provided',
    );
  }
}
