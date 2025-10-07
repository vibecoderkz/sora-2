# ✅ Чеклист для деплоя на Render.com

## Перед деплоем

- [ ] Все изменения закоммичены в Git
- [ ] `.env` файл в `.gitignore`
- [ ] Все секреты удалены из кода
- [ ] `render.yaml` файл создан
- [ ] `package.json` содержит `engines.node`
- [ ] README обновлен

## Создание сервиса на Render

- [ ] Зарегистрироваться на [render.com](https://render.com)
- [ ] Подключить GitHub репозиторий
- [ ] Выбрать "New Web Service"
- [ ] Render обнаружил `render.yaml`

## Настройка переменных окружения

### Обязательные:

- [ ] `TELEGRAM_BOT_TOKEN` - получить у [@BotFather](https://t.me/BotFather)
- [ ] `OPENAI_API_KEY` - [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- [ ] `STRIPE_SECRET_KEY` - [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
- [ ] `ADMIN_USER_ID` - получить у [@userinfobot](https://t.me/userinfobot)

### Опциональные (уже в render.yaml):

- [ ] `MAX_CONCURRENT_JOBS=1`
- [ ] `WORKER_POLL_INTERVAL=5000`
- [ ] `MAX_RETRY_ATTEMPTS=2`
- [ ] `NODE_ENV=production`

## Настройка Persistent Disk

- [ ] Disk name: `bot-data`
- [ ] Mount path: `/opt/render/project/src/data`
- [ ] Size: 1GB
- [ ] Disk подключен к сервису

## После деплоя

- [ ] Проверить логи на ошибки
- [ ] Отправить `/start` боту в Telegram
- [ ] Протестировать генерацию текст → видео
- [ ] Протестировать генерацию изображение → видео
- [ ] Проверить работу оплаты Stripe
- [ ] Проверить admin команду `/users`

## Stripe вебхук (опционально)

Если нужны автоматические уведомления о платежах:

- [ ] Скопировать URL: `https://your-service.onrender.com`
- [ ] Stripe Dashboard → Webhooks → Add endpoint
- [ ] URL: `https://your-service.onrender.com/webhook/stripe`
- [ ] Events: `checkout.session.completed`
- [ ] Скопировать Signing secret в `STRIPE_WEBHOOK_SECRET`

## Мониторинг

- [ ] Добавить service URL в закладки
- [ ] Настроить уведомления в Render (Email/Slack)
- [ ] Протестировать восстановление после рестарта

## Troubleshooting

### Бот не отвечает
1. Проверить логи на Render
2. Убедиться, что все env переменные установлены
3. Проверить правильность TELEGRAM_BOT_TOKEN

### База данных сбрасывается
1. Убедиться, что Persistent Disk создан
2. Проверить mount path: `/opt/render/project/src/data`
3. Disk должен быть подключен к сервису

### Canvas ошибки
- Render использует Ubuntu → canvas работает из коробки
- Если проблема: проверить логи установки npm

### Out of memory
- Free tier: 512MB RAM
- Upgrade до Starter ($7/мес) для стабильности
- Или уменьшить `MAX_CONCURRENT_JOBS=1`

## Готово! 🎉

Ваш бот работает 24/7 на Render.com

- 📊 Мониторинг: https://dashboard.render.com
- 📝 Логи в реальном времени
- 🔄 Автоматические деплои при push
- 💾 Постоянное хранилище для БД
- 🔒 HTTPS из коробки
