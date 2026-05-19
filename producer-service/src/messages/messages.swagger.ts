import { ApiProperty } from '@nestjs/swagger';

export class HttpErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Either "telegram" or "payload" must be provided' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['type must be a string', 'type should not be empty'],
      },
    ],
    description:
      'Текст ошибки или массив сообщений валидации (class-validator)',
  })
  message: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error: string;
}

export const sendMessageBodyExamples = {
  telegram: {
    summary: 'Telegram-уведомление',
    description:
      'Поле telegram разворачивается в payload сообщения в очереди',
    value: {
      type: 'telegram',
      telegram: {
        chatId: '123456789',
        text: 'Привет из producer-service',
      },
    },
  },
  genericPayload: {
    summary: 'Произвольный payload',
    description: 'Используйте payload, если структура не совпадает с telegram',
    value: {
      type: 'email',
      messageId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      payload: {
        to: 'user@example.com',
        subject: 'Тема',
        body: 'Текст письма',
      },
    },
  },
} as const;

export const validationErrorExample = {
  statusCode: 400,
  message: [
    'type must be a string',
    'type should not be empty',
    'property unknownField should not exist',
  ],
  error: 'Bad Request',
};

export const missingPayloadErrorExample = {
  statusCode: 400,
  message: 'Either "telegram" or "payload" must be provided',
  error: 'Bad Request',
};

export const internalErrorExample = {
  statusCode: 500,
  message: 'Internal Server Error',
  error: 'Internal Server Error',
};
