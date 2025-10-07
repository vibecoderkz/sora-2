# 🚀 Быстрый старт для деплоя на Render.com

## Что было сделано

✅ Проект полностью подготовлен к деплою на Render.com  
✅ Image-to-video функционал работает  
✅ Восстановление прерванных задач при рестарте  
✅ Автоматическое создание data/ директории  
✅ Все секреты в .env (не в git)  

## Документация

📖 **[RENDER_DEPLOY.md](RENDER_DEPLOY.md)** - Полная инструкция по деплою  
📋 **[DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md)** - Чеклист для проверки  
📊 **[DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)** - Детальная сводка изменений  
📚 **[README.md](README.md)** - Основная документация проекта  

## Быстрый деплой (5 минут)

### 1. Подготовка кода

```bash
git add .
git commit -m "Prepare for Render.com deployment"
git push origin main
```

### 2. Создание сервиса на Render

1. Зайти на [render.com](https://render.com)
2. New + → Web Service
3. Подключить GitHub репозиторий
4. Render автоматически обнаружит `render.yaml`

### 3. Настройка переменных (Environment)

В Render Dashboard → Environment добавить:

```
TELEGRAM_BOT_TOKEN=your_bot_token
OPENAI_API_KEY=your_openai_key
STRIPE_SECRET_KEY=your_stripe_key
ADMIN_USER_ID=your_telegram_user_id
```

**Где взять:**
- `TELEGRAM_BOT_TOKEN`: [@BotFather](https://t.me/BotFather)
- `OPENAI_API_KEY`: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- `STRIPE_SECRET_KEY`: [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
- `ADMIN_USER_ID`: [@userinfobot](https://t.me/userinfobot)

### 4. Настройка Persistent Disk

Render автоматически создаст из `render.yaml`:
- Name: `bot-data`
- Mount: `/opt/render/project/src/data`
- Size: 1GB

### 5. Деплой

Нажать **"Create Web Service"** → Render сделает всё сам!

## После деплоя

Проверить работу:
```
/start - Запуск бота
/generate test prompt - Генерация видео
Отправить фото с подписью - Image-to-video
/users - Admin статистика
```

## Стоимость

**Free Tier** (0$/мес):
- ✅ 750 часов/месяц (1 сервис 24/7)
- ⚠️ Засыпает после 15 мин неактивности
- ⚠️ 512MB RAM

**Starter** ($7/мес) - **РЕКОМЕНДУЕТСЯ**:
- ✅ Без засыпания (работает 24/7)
- ✅ Более стабильно
- ✅ 512MB RAM гарантированно

## Проблемы?

См. Troubleshooting в [RENDER_DEPLOY.md](RENDER_DEPLOY.md)

---

**Готово! Ваш бот работает 24/7 на Render.com** 🎉
