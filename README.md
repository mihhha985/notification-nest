# Notification System with RabbitMQ and Telegram

Микросервисная система для отправки уведомлений через RabbitMQ с последующей доставкой в Telegram.

## Архитектура

- **producer-service** — HTTP API (NestJS), принимает запросы и публикует сообщения в RabbitMQ.
- **consumer-telegram-service** — читает очередь и отправляет сообщения в Telegram через Bot API.
- **RabbitMQ** — брокер сообщений (exchange `notifications`, очередь `telegram.notifications`).

## Требования

- Docker и Docker Compose
- Node.js 18+ (для локальной разработки без Docker)
- Telegram Bot Token (получить у [@BotFather](https://t.me/botfather))
- Telegram Chat ID (получить через [@userinfobot](https://t.me/userinfobot))

## Быстрый старт

1. Скопировать `.env.example` в `.env` в корне проекта.
2. Указать свой `TELEGRAM_BOT_TOKEN` в `.env`.
3. При необходимости изменить остальные переменные (значения по умолчанию см. в `.env.example`).
4. Запустить стек: `docker compose up -d`.

После запуска:

- Producer API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api`
- RabbitMQ Management UI: `http://localhost:15672` (логин/пароль по умолчанию: `guest` / `guest`)

## Проверка отправки уведомления

1. Откройте Telegram и **запустите бота** (нажмите «Start» / отправьте `/start`). Без этого бот не сможет писать вам в личные сообщения.
2. Узнайте свой `chatId` через [@userinfobot](https://t.me/userinfobot) и подставьте его в запрос ниже вместо `123456789`.

Пример запроса (Bash / Git Bash):

```bash
curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"telegram\",\"telegram\":{\"chatId\":\"123456789\",\"text\":\"Тестовое сообщение из curl\"}}"
```

Тот же запрос можно отправить через Postman или из Swagger: [http://localhost:3000/api](http://localhost:3000/api).

При успешной публикации API вернёт `202 Accepted`; сообщение дойдёт до Telegram после обработки consumer-сервисом.
