import { Module } from '@nestjs/common';
import { RabbitMqModule } from '../rabbitmq/rabbitmq.module';
import { MessagesController } from './messages.controller';

@Module({
  imports: [RabbitMqModule],
  controllers: [MessagesController],
})
export class MessagesModule {}
