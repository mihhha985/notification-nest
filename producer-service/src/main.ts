import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { getEnvNumber } from './common/config/env.helper';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = getEnvNumber(configService, 'PORT', 3000);
  const config = new DocumentBuilder()
    .setTitle('Producer API')
    .setDescription('Notification system - producer service API')
    .setVersion('1.0')
    .addTag('messages', 'Публикация уведомлений в очередь')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(port);
}
bootstrap();
