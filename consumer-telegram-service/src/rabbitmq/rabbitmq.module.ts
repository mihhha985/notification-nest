import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { RabbitMqConsumerService } from './rabbitmq-consumer.service';

@Module({
  imports: [MessagingModule],
  providers: [RabbitMqConsumerService],
})
export class RabbitMqModule {}
