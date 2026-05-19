import { Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { MessageHandlerService } from './message-handler.service';
import { ProcessedMessageStore } from './processed-message.store';

@Module({
  imports: [TelegramModule],
  providers: [MessageHandlerService, ProcessedMessageStore],
  exports: [MessageHandlerService],
})
export class MessagingModule {}
