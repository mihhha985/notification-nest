import { Injectable, Logger } from '@nestjs/common';
import {
  InboundMessage,
  NotificationPayload,
  ProcessingResult,
} from '../rabbitmq/interfaces/message.interface';
import { TelegramService } from '../telegram/telegram.service';
import { ProcessedMessageStore } from './processed-message.store';

@Injectable()
export class MessageHandlerService {
  private readonly logger = new Logger(MessageHandlerService.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly processedStore: ProcessedMessageStore,
  ) {}

  async handle(raw: Buffer): Promise<ProcessingResult> {
    let message: InboundMessage<NotificationPayload>;

    try {
      message = JSON.parse(raw.toString('utf-8')) as InboundMessage<NotificationPayload>;
    } catch {
      return {
        outcome: 'failed',
        messageId: 'unknown',
        error: 'Invalid JSON payload',
      };
    }

    if (!message.messageId) {
      return {
        outcome: 'failed',
        messageId: 'unknown',
        error: 'messageId is required',
      };
    }

    if (this.processedStore.has(message.messageId)) {
      this.logger.warn(
        `Duplicate message skipped (idempotent): messageId=${message.messageId}`,
      );
      return { outcome: 'duplicate', messageId: message.messageId };
    }

    const chatId = message.payload?.chatId;
    const text = message.payload?.text;

    if (!chatId || !text) {
      return {
        outcome: 'failed',
        messageId: message.messageId,
        error: 'payload.chatId and payload.text are required',
      };
    }

    try {
      await this.telegramService.sendMessage(String(chatId), String(text));
      this.processedStore.add(message.messageId);

      this.logger.log(
        `Message processed successfully: messageId=${message.messageId}, type=${message.type}, chatId=${chatId}`,
      );

      return { outcome: 'success', messageId: message.messageId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown processing error';

      this.logger.error(
        `Message processing failed: messageId=${message.messageId}, error=${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      return {
        outcome: 'failed',
        messageId: message.messageId,
        error: errorMessage,
      };
    }
  }
}
