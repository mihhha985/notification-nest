# Notification System with RabbitMQ and Telegram

Микросервисная система для отправки уведомлений через RabbitMQ с последующей доставкой в Telegram.

## 📋 Требования

- Docker и Docker Compose
- Node.js 18+ (для локальной разработки)
- Telegram Bot Token (получить у [@BotFather](https://t.me/botfather))
- Telegram Chat ID (получить через [@userinfobot](https://t.me/userinfobot))

## 🚀 Быстрый старт

1. Создать файл .env  в корне проекта 
2. Добавить свой Telegram Bot Token в переменную TELEGRAM_BOT_TOKEN
3. Остальные переменные можно скопировать из файла .env.example
4. Запустить докер командой docker compose up -d

### 1. Тестовый запуск RabbitMQ

Для тестирования функционала, откройте свой телеграм клиент и запустите созданного бота,
далее выпоните команду для BASH 
curl -X POST http://localhost:3000/messages -H "Content-Type: application/json" -d "{\"type\":\"telegram\",\"telegram\":{\"chatId\":\"123456789\",\"text\":\"Тестовое сообщение из curl\"}}"
либо можно к примеру через Postman, подробнее в документации Swagger [http:localhost:3000/api]
для того чтобы клиент телеграма смог отправить сообщение, вам нужно передать корректный chat id,
получив его из @userinfobot