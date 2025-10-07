# Деплой на Render.com

## Быстрый старт

### 1. Подготовка репозитория

Убедитесь, что ваш код загружен на GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sora-telegram-bot.git
git push -u origin main
```

### 2. Создание проекта на Render

1. Зайдите на [render.com](https://render.com) и создайте аккаунт
2. Нажмите **"New +"** → **"Web Service"**
3. Подключите ваш GitHub репозиторий
4. Render автоматически обнаружит `render.yaml` конфигурацию

### 3. Настройка переменных окружения

В дашборде Render перейдите в **Environment** и добавьте следующие переменные:

#### Обязательные переменные:

```
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
OPENAI_API_KEY=your_openai_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
ADMIN_USER_ID=your_telegram_user_id
```

#### Опциональные переменные (уже есть в render.yaml):

```
MAX_CONCURRENT_JOBS=1
WORKER_POLL_INTERVAL=5000
MAX_RETRY_ATTEMPTS=2
NODE_ENV=production
```

### 4. Настройка Persistent Disk

Render автоматически создаст persistent disk из `render.yaml`:

- **Name**: `bot-data`
- **Mount Path**: `/opt/render/project/src/data`
- **Size**: 1GB

Это обеспечит сохранность базы данных SQLite при перезапусках.

### 5. Деплой

1. Нажмите **"Create Web Service"**
2. Render автоматически:
   - Установит зависимости (`npm install`)
   - Запустит бота (`node src/index.js`)
   - Настроит автоматическое восстановление при падении

### 6. Webhook для Stripe (опционально)

Если используете Stripe вебхуки для подтверждения платежей:

1. В Render скопируйте URL вашего сервиса (например: `https://your-service.onrender.com`)
2. В Stripe Dashboard → Webhooks → Add endpoint
3. URL: `https://your-service.onrender.com/webhook/stripe`
4. Events: `checkout.session.completed`

## Мониторинг

### Логи

Просмотр логов в реальном времени:
- Перейдите в ваш сервис на Render
- Вкладка **"Logs"**

### Статус

Проверить работу бота:
- Отправьте `/start` в Telegram
- Проверьте логи на наличие ошибок

## Обновления

При каждом push в main ветку GitHub, Render автоматически:
1. Обнаружит изменения
2. Пересоберет проект
3. Перезапустит сервис
4. Восстановит прерванные задания

## Troubleshooting

### Бот не отвечает

1. Проверьте логи на Render
2. Убедитесь, что все env переменные установлены
3. Проверьте, что TELEGRAM_BOT_TOKEN корректный

### База данных сбрасывается

Убедитесь, что:
1. Persistent disk настроен правильно
2. Mount path: `/opt/render/project/src/data`
3. Disk подключен к сервису

### Canvas/Sharp ошибки

Render использует Ubuntu, поэтому `canvas` должен работать из коробки. Если возникают проблемы:

```bash
# В render.yaml уже настроен buildCommand
buildCommand: npm install
```

### Недостаточно памяти

Free tier Render имеет ограничение 512MB RAM. Если нужно больше:
- Upgrade до платного плана (Starter - $7/мес, 512MB → более стабильная работа)
- Или оптимизируйте `MAX_CONCURRENT_JOBS=1`

## Стоимость

**Free tier:**
- ✅ 750 часов в месяц (достаточно для 1 сервиса 24/7)
- ✅ Автоматические деплои
- ✅ HTTPS
- ⚠️ Засыпает после 15 минут неактивности
- ⚠️ 512MB RAM

**Starter ($7/мес):**
- ✅ Без засыпания
- ✅ 512MB RAM гарантированно
- ✅ Приоритетная поддержка

Для production бота рекомендуется Starter план.

## Альтернативные конфигурации

### Background Worker (для более стабильной работы)

Если нужен отдельный воркер для обработки видео:

```yaml
services:
  - type: web
    name: sora-bot-web
    # ... API endpoints only

  - type: worker
    name: sora-bot-worker
    # ... video processing only
```

### Redis для очереди (optional, для масштабирования)

Если планируете много пользователей, замените SQLite queue на Redis.

## Безопасность

✅ Все секреты в Environment Variables
✅ `.env` в `.gitignore`
✅ HTTPS по умолчанию
✅ Автоматические обновления Node.js

## Поддержка

При проблемах:
1. Проверьте логи Render
2. Посмотрите issues в GitHub репозитории
3. Telegram: @your_support_username
