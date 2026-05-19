import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { randomUUID } from 'crypto';
import { getEnvNumber } from '../common/config/env.helper';
import { withRetry } from '../common/retry/retry.helper';
import {
  OutboundMessage,
  PublishResult,
} from './interfaces/message.interface';

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.ConfirmChannel | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  async publish<T extends Record<string, unknown>>(
    type: string,
    payload: T,
    messageId?: string,
  ): Promise<PublishResult> {
    const exchange = this.configService.get<string>('RABBITMQ_EXCHANGE');
    const routingKey = this.configService.get<string>('RABBITMQ_ROUTING_KEY');

    const message: OutboundMessage<T> = {
      messageId: messageId ?? randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      payload,
    };

    const body = Buffer.from(JSON.stringify(message));

    return withRetry(
      async () => {
        await this.ensureChannel();

        const published = this.channel.publish(
          exchange,
          routingKey,
          body,
          {
            contentType: 'application/json',
            contentEncoding: 'utf-8',
            deliveryMode: 2,
            messageId: message.messageId,
            timestamp: Date.now(),
            headers: {
              'x-message-type': type,
            },
          },
        );

        if (!published) {
          throw new Error('RabbitMQ write buffer is full');
        }

        await this.channel.waitForConfirms();

        this.logger.log(
          `Message ${message.messageId} confirmed by broker (${exchange}/${routingKey})`,
        );

        return {
          messageId: message.messageId,
          exchange,
          routingKey,
          confirmed: true,
        };
      },
      {
        maxAttempts: getEnvNumber(
          this.configService,
          'RABBITMQ_PUBLISH_RETRY_ATTEMPTS',
          3,
        ),
      },
    );
  }

  private async connect(): Promise<void> {
    const url = this.buildConnectionUrl();

    await withRetry(
      async () => {
        await this.disconnect();

        this.logger.log(`Connecting to RabbitMQ at ${this.maskUrl(url)}`);
        this.connection = await amqp.connect(url);
        this.connection.on('error', (error) => {
          this.logger.error('RabbitMQ connection error', error.stack);
        });
        this.connection.on('close', () => {
          this.logger.warn('RabbitMQ connection closed');
          this.channel = null;
        });

        this.channel = await this.connection.createConfirmChannel();
        await this.channel.prefetch(1);

        const exchange = this.configService.get<string>('RABBITMQ_EXCHANGE');
        await this.channel.assertExchange(exchange, 'topic', { durable: true });

        this.logger.log('RabbitMQ confirm channel ready');
      },
      {
        maxAttempts: getEnvNumber(
          this.configService,
          'RABBITMQ_CONNECT_RETRY_ATTEMPTS',
          5,
        ),
      },
    );
  }

  private async ensureChannel(): Promise<void> {
    if (this.channel) {
      return;
    }

    this.logger.warn('RabbitMQ channel unavailable, reconnecting...');
    await this.connect();
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
    } catch {
      // ignore close errors during shutdown
    } finally {
      this.channel = null;
    }

    try {
      if (this.connection) {
        await this.connection.close();
      }
    } catch {
      // ignore close errors during shutdown
    } finally {
      this.connection = null;
    }
  }

  private buildConnectionUrl(): string {
    const configuredUrl = this.configService.get<string>('RABBITMQ_URL');
    if (configuredUrl) {
      return configuredUrl;
    }

    const user = this.configService.get<string>('RABBITMQ_USER', 'guest');
    const password = this.configService.get<string>(
      'RABBITMQ_PASSWORD',
      'guest',
    );
    const host = this.configService.get<string>('RABBITMQ_HOST', 'localhost');
    const port = getEnvNumber(this.configService, 'RABBITMQ_PORT', 5672);
    const vhost = encodeURIComponent(
      this.configService.get<string>('RABBITMQ_VHOST', '/'),
    );

    return `amqp://${user}:${password}@${host}:${port}/${vhost}`;
  }

  private maskUrl(url: string): string {
    return url.replace(/:([^:@/]+)@/, ':***@');
  }
}
