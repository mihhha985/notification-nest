import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { MessagesModule } from './messages/messages.module';
import { RabbitMqModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '..', '.env'),
      ],
    }),
    RabbitMqModule,
    MessagesModule,
  ],
})
export class AppModule {}
