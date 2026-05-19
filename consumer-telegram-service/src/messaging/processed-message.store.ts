import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getEnvNumber } from '../common/config/env.helper';

@Injectable()
export class ProcessedMessageStore {
  private readonly ids = new Set<string>();
  private readonly maxSize: number;

  constructor(private readonly configService: ConfigService) {
    this.maxSize = getEnvNumber(
      this.configService,
      'IDEMPOTENCY_CACHE_SIZE',
      10_000,
    );
  }

  has(messageId: string): boolean {
    return this.ids.has(messageId);
  }

  add(messageId: string): void {
    if (this.ids.size >= this.maxSize) {
      const oldest = this.ids.values().next().value;
      if (oldest) {
        this.ids.delete(oldest);
      }
    }

    this.ids.add(messageId);
  }
}
