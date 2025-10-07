# 🎬 Sora-2 Telegram Bot

Telegram бот для генерации видео с помощью OpenAI Sora-2 API

## ✨ Возможности

- 📹 **Генерация видео из текста** - создавайте видео по описанию
- 🖼️ **Генерация видео из изображения** - используйте фото как первый кадр
- ⚙️ **Настройка параметров** - длительность (4-12 сек), ориентация, качество
- 💳 **Оплата** - Stripe (карты) и Kaspi
- 🎯 **Автоочередь** - фоновая обработка всех задач
- 💰 **Автовозврат** - токены возвращаются при ошибках
- 📊 **Прогресс в реальном времени** - отслеживание генерации

## 🚀 Быстрый старт

### Деплой на Render.com (рекомендуется)

Готовый бот можно задеплоить на Render.com в один клик! Подробная инструкция: [RENDER_DEPLOY.md](RENDER_DEPLOY.md)

### Локальная установка

#### 1. Установка

```bash
npm install
```

#### 2. Настройка

Скопируйте `.env.example` в `.env` и заполните свои данные:

```bash
cp .env.example .env
```

Затем отредактируйте `.env`:

```env
# Обязательные параметры
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OPENAI_API_KEY=your_openai_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
ADMIN_USER_ID=your_telegram_user_id

# Опционально
MAX_CONCURRENT_JOBS=1
WORKER_POLL_INTERVAL=5000
MAX_RETRY_ATTEMPTS=2
```

**Как получить данные:**
- `TELEGRAM_BOT_TOKEN`: создайте бота через [@BotFather](https://t.me/BotFather)
- `OPENAI_API_KEY`: получите на [platform.openai.com](https://platform.openai.com/api-keys)
- `STRIPE_SECRET_KEY`: создайте на [dashboard.stripe.com](https://dashboard.stripe.com/apikeys)
- `ADMIN_USER_ID`: узнайте свой ID через [@userinfobot](https://t.me/userinfobot)

#### 3. Запуск

```bash
# Разработка (с автоперезагрузкой)
npm run dev

# Продакшн
npm start
```

## 📚 Команды бота

### Для пользователей

- `/start` - Главное меню
- `/help` - Подробная справка по использованию
- `/generate <промпт>` - Создать видео из текста
- `/balance` - Проверить баланс и историю
- `/buy` - Купить токены (Stripe или Kaspi)
- `/queue` - Статус очереди задач

### Для администратора

- `/topup @username amount` - Пополнить баланс пользователя

Пример:
```
/topup @ivan_petrov 1484
/topup icai_kz 5000
```

## 💰 Ценообразование

**1 токен = 1₸ (тенге)**

### Цены на видео (8 секунд):
- Sora-2 (720p): **742₸**
- Sora-2 Pro (720p): **1,928₸**
- Sora-2 Pro (1080p): **3,115₸**

### Пакеты токенов:
- 742 токена за 742₸ (1 видео)
- 1,484 токена за 1,336₸ (2 видео, -10%)
- 3,710 токенов за 3,154₸ (5 видео, -15%)
- 7,420 токенов за 5,936₸ (10 видео, -20%)

## 📖 Использование

### Генерация из текста

```
/generate A cat playing piano in a jazz club
```

💡 **Советы для лучших результатов:**
- Описывайте тип кадра (wide shot, close-up)
- Укажите действие и обстановку
- Добавьте освещение (golden hour, morning light)

Пример:
```
/generate Wide shot of a child flying a red kite in a grassy park, golden hour sunlight, camera slowly pans upward
```

### Генерация из изображения

1. **Отправьте фото боту с подписью**
2. **В подписи опишите действие**
3. **Выберите качество**

Примеры:
- Фото комнаты + "Camera slowly pans around"
- Фото человека + "She turns and smiles"
- Пейзаж + "Rain starts falling"

⚠️ Изображение должно соответствовать выбранному разрешению видео

## 🛠️ Административные скрипты

### Пополнение баланса (Kaspi)

```bash
node scripts/add-kaspi-tokens.js username amount
```

Примеры:
```bash
node scripts/add-kaspi-tokens.js ivan_petrov 742    # Пакет 1
node scripts/add-kaspi-tokens.js maria_k 1484       # Пакет 2
node scripts/add-kaspi-tokens.js alex_s 3710        # Пакет 3
```

### Анализ прибыли

```bash
node scripts/profit-analysis.js
```

Покажет:
- Прибыль с каждого типа видео
- Прибыль с пакетов токенов
- Чистую маржу после всех комиссий

### Миграция базы данных

```bash
node scripts/migrate-add-video-params.js
```

## 📁 Структура проекта

```
sora-2/
├── src/
│   ├── index.js          # Главный файл, команды, обработка ошибок
│   ├── commands.js       # Обработчики команд (/start, /help, /generate)
│   ├── callbacks.js      # Обработка кнопок (Kaspi, Stripe, настройки)
│   ├── worker.js         # Фоновая обработка видео
│   ├── pricing.js        # Расчет цен
│   ├── database.js       # SQLite операции
│   ├── stripe.js         # Интеграция Stripe
│   └── sora.js           # Интеграция Sora API
├── data/
│   └── bot.db            # База данных SQLite
├── scripts/
│   ├── add-kaspi-tokens.js           # Пополнение через Kaspi
│   ├── profit-analysis.js            # Анализ прибыли
│   ├── pricing-calculator-new.js     # Калькулятор цен
│   └── migrate-add-video-params.js   # Миграция БД
├── docs/
│   ├── FINAL_UPDATE_SUMMARY.md       # Полная сводка всех обновлений
│   ├── PROFIT_REPORT.md              # Детальный анализ прибыли
│   ├── UX_IMPROVEMENTS.md            # Описание UX улучшений
│   ├── KASPI_PAYMENT.md              # Инструкция для Kaspi платежей
│   ├── KASPI_SETUP_SUMMARY.md        # Краткая сводка Kaspi
│   ├── PRICING.md                    # Документация по ценам
│   └── api-doc.md                    # Документация Sora API
├── package.json
├── .env
└── README.md
```

## 🔧 Конфигурация

### Переменные окружения

| Переменная | Описание | Обязательно |
|------------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота | ✅ |
| `OPENAI_API_KEY` | API ключ OpenAI | ✅ |
| `STRIPE_SECRET_KEY` | Секретный ключ Stripe | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Webhook секрет Stripe | ✅ |
| `MAX_CONCURRENT_JOBS` | Макс. одновременных задач | ❌ (default: 1) |
| `WORKER_POLL_INTERVAL` | Интервал проверки очереди (мс) | ❌ (default: 5000) |
| `MAX_RETRY_ATTEMPTS` | Макс. попыток при ошибке | ❌ (default: 2) |

### База данных

Бот использует SQLite для хранения:
- Пользователи и балансы
- История заказов
- Очередь задач
- Сгенерированные видео

База создается автоматически при первом запуске в `data/bot.db`

## 🎨 UX/UI Features

- ✅ Прогресс-бар редактируется (не спамит чат)
- ✅ Понятные ошибки на русском языке
- ✅ Цены на кнопках выбора
- ✅ Автоматический возврат токенов при ошибках
- ✅ Умная логика повторов (не повторяет ошибки модерации/биллинга)
- ✅ Выбор способа оплаты (Stripe/Kaspi)

## 📊 Производительность

### Время генерации:
- Sora-2: ~2-5 минут
- Sora-2 Pro: ~5-10 минут

### Прибыльность:
- **50% маржи** на каждое видео после вычета API и Stripe
- Пример: Sora-2 (8 сек) - прибыль 192₸ с видео

Подробнее в [docs/PROFIT_REPORT.md](docs/PROFIT_REPORT.md)

## 🔒 Безопасность

- ✅ Обработка всех ошибок и edge cases
- ✅ Валидация входных данных
- ✅ Защита от переполнения очереди
- ✅ Graceful shutdown с завершением активных задач
- ✅ Автоматический retry при сетевых ошибках
- ✅ Админ-команды защищены проверкой user_id

## 🚧 Ограничения API

Sora API блокирует:
- ❌ Генерацию реальных людей (включая знаменитостей)
- ❌ Лица людей на входных изображениях
- ❌ Контент 18+
- ❌ Защищенные авторским правом персонажи
- ❌ Защищенную авторским правом музыку

## 📝 Документация

- [FINAL_UPDATE_SUMMARY.md](docs/FINAL_UPDATE_SUMMARY.md) - Полная сводка всех обновлений
- [PROFIT_REPORT.md](docs/PROFIT_REPORT.md) - Детальный анализ прибыли
- [UX_IMPROVEMENTS.md](docs/UX_IMPROVEMENTS.md) - Описание UX улучшений
- [KASPI_PAYMENT.md](docs/KASPI_PAYMENT.md) - Инструкция для Kaspi платежей
- [PRICING.md](docs/PRICING.md) - Документация по ценам
- [api-doc.md](docs/api-doc.md) - Документация Sora API

## 🤝 Поддержка

По всем вопросам: @z_dias_c

## 📄 Лицензия

MIT
#   s o r a - 2  
 