import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { RabbitMqService } from '../rabbitmq/rabbitmq.service';
import { PublishResult } from '../rabbitmq/interfaces/message.interface';
import { SendMessageDto } from './messages.dto';

@Controller('messages')
export class MessagesController {
  constructor(private readonly rabbitMqService: RabbitMqService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
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
