import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TelegramPayloadDto {
  @ApiProperty({
    example: '123456789',
    description: 'ID чата Telegram',
  })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty({
    example: 'Текст уведомления',
    description: 'Текст сообщения',
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class SendMessageDto {
  @ApiPropertyOptional({
    format: 'uuid',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description:
      'Необязательный UUID v4. Если не указан — генерируется автоматически',
  })
  @IsUUID('4')
  @IsOptional()
  messageId?: string;

  @ApiProperty({
    example: 'telegram',
    description:
      'Тип уведомления. Передаётся в заголовок x-message-type и в тело сообщения в очереди',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({
    type: TelegramPayloadDto,
    description:
      'Payload для Telegram. Обязательно указать telegram или payload (хотя бы одно)',
  })
  @ValidateNested()
  @Type(() => TelegramPayloadDto)
  @IsOptional()
  telegram?: TelegramPayloadDto;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { to: 'user@example.com', subject: 'Тема' },
    description:
      'Произвольный объект payload. Обязательно указать telegram или payload (хотя бы одно)',
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
