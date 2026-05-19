import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getEnvNumber } from '../common/config/env.helper';
import { withRetry, isRetryableTelegramError } from '../common/retry/retry.helper';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly apiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    this.apiBaseUrl = `https://api.telegram.org/bot${token}`;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    await withRetry(
      async () => {
        const response = await fetch(`${this.apiBaseUrl}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(
            `Telegram API ${response.status}: ${body || response.statusText}`,
          );
        }

        const result = (await response.json()) as { ok: boolean; description?: string };
        if (!result.ok) {
          throw new Error(result.description ?? 'Telegram API returned ok=false');
        }
      },
      {
        maxAttempts: getEnvNumber(
          this.configService,
          'TELEGRAM_SEND_RETRY_ATTEMPTS',
          3,
        ),
        shouldRetry: isRetryableTelegramError,
      },
    );

    this.logger.debug(`Telegram message sent to chat ${chatId}`);
  }
}
