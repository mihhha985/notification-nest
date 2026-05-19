import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TelegramPayloadDto {
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}

export class SendMessageDto {
  @IsUUID('4')
  @IsOptional()
  messageId?: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @ValidateNested()
  @Type(() => TelegramPayloadDto)
  @IsOptional()
  telegram?: TelegramPayloadDto;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
