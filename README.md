# Notification System with RabbitMQ and Telegram

Микросервисная система для отправки уведомлений через RabbitMQ с последующей доставкой в Telegram.

## 📋 Требования

- Docker и Docker Compose
- Node.js 18+ (для локальной разработки)
- Telegram Bot Token (получить у [@BotFather](https://t.me/botfather))
- Telegram Chat ID (получить через [@userinfobot](https://t.me/userinfobot))

## 🚀 Быстрый старт

### 1. Тестовый запуск RabbitMQ

Для изолированного тестирования RabbitMQ:

```bash
docker-compose -f docker-compose.rabbitmq.yml up -d