import { ApiProperty } from '@nestjs/swagger';

export class PublishResultDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Идентификатор сообщения (переданный или сгенерированный)',
  })
  messageId: string;

  @ApiProperty({
    example: 'notifications',
    description: 'Exchange RabbitMQ, в который опубликовано сообщение',
  })
  exchange: string;

  @ApiProperty({
    example: 'notification.telegram',
    description: 'Routing key маршрутизации',
  })
  routingKey: string;

  @ApiProperty({
    example: true,
    description: 'Подтверждение брокером (publisher confirm)',
  })
  confirmed: boolean;
}
