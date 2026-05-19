import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { getEnvNumber } from '../common/config/env.helper';
import { withRetry } from '../common/retry/retry.helper';
import { MessageHandlerService } from '../messaging/message-handler.service';

@Injectable()
export class RabbitMqConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqConsumerService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private consumerTag: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly messageHandler: MessageHandlerService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
    await this.startConsuming();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channel && this.consumerTag) {
      await this.channel.cancel(this.consumerTag);
    }
    await this.disconnect();
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

        this.channel = await this.connection.createChannel();

        const prefetch = getEnvNumber(this.configService, 'RABBITMQ_PREFETCH', 1);
        await this.channel.prefetch(prefetch);

        const exchange = this.configService.get<string>('RABBITMQ_EXCHANGE');
        const queue = this.configService.get<string>('RABBITMQ_QUEUE');
        const routingKey = this.configService.get<string>(
          'RABBITMQ_ROUTING_KEY',
        );

        await this.channel.assertExchange(exchange, 'topic', { durable: true });
        await this.channel.assertQueue(queue, { durable: true });
        await this.channel.bindQueue(queue, exchange, routingKey);

        this.logger.log(
          `RabbitMQ consumer ready (queue=${queue}, routingKey=${routingKey})`,
        );
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

  private async startConsuming(): Promise<void> {
    const queue = this.configService.get<string>('RABBITMQ_QUEUE');
    const autoAck =
      this.configService.get<string>('RABBITMQ_AUTO_ACK', 'false') === 'true';

    const { consumerTag } = await this.channel.consume(
      queue,
      (msg) => {
        if (!msg) {
          return;
        }

        void this.handleDelivery(msg, autoAck);
      },
      { noAck: autoAck },
    );

    this.consumerTag = consumerTag;
    this.logger.log(
      `Consuming from "${queue}" (ack mode: ${autoAck ? 'auto' : 'manual'})`,
    );
  }

  private async handleDelivery(
    msg: amqp.ConsumeMessage,
    autoAck: boolean,
  ): Promise<void> {
    const retryCount = this.getRetryCount(msg);

    try {
      const result = await this.messageHandler.handle(msg.content);

      if (autoAck) {
        return;
      }

      if (result.outcome === 'success' || result.outcome === 'duplicate') {
        this.channel.ack(msg);
        return;
      }

      await this.handleFailure(msg, result.messageId, result.error, retryCount);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unexpected consumer error';

      this.logger.error(
        `Unhandled consumer error: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (!autoAck) {
        await this.handleFailure(msg, 'unknown', errorMessage, retryCount);
      }
    }
  }

  private async handleFailure(
    msg: amqp.ConsumeMessage,
    messageId: string,
    error: string | undefined,
    retryCount: number,
  ): Promise<void> {
    const maxRetries = getEnvNumber(
      this.configService,
      'RABBITMQ_MAX_RETRIES',
      3,
    );

    if (retryCount < maxRetries) {
      const nextRetry = retryCount + 1;
      const queue = this.configService.get<string>('RABBITMQ_QUEUE');

      this.logger.warn(
        `Requeueing message for retry: messageId=${messageId}, attempt=${nextRetry}/${maxRetries}, error=${error}`,
      );

      this.channel.sendToQueue(queue, msg.content, {
        persistent: true,
        contentType: msg.properties.contentType,
        headers: {
          ...msg.properties.headers,
          'x-retry-count': nextRetry,
        },
      });
      this.channel.ack(msg);
      return;
    }

    this.logger.error(
      `Message discarded after ${maxRetries} retries: messageId=${messageId}, error=${error}`,
    );
    this.channel.nack(msg, false, false);
  }

  private getRetryCount(msg: amqp.ConsumeMessage): number {
    const header = msg.properties.headers?.['x-retry-count'];

    if (typeof header === 'number') {
      return header;
    }

    if (typeof header === 'string') {
      const parsed = Number(header);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
    } catch {
      // ignore
    } finally {
      this.channel = null;
    }

    try {
      if (this.connection) {
        await this.connection.close();
      }
    } catch {
      // ignore
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
