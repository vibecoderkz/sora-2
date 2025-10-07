import { db } from './database.js';
import { createCheckoutSession } from './stripe.js';
import { createVideo } from './sora.js';

export async function handleStart(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || msg.from.first_name;

  let user = db.getUser(userId);
  if (!user) {
    db.createUser(userId, username);
    user = db.getUser(userId);
  }

  const welcomeMessage = `
Добро пожаловать в Sora-2 Video Generator Bot! 🎬

Команды:
/help - Справка по использованию
/balance - Проверить баланс
/buy - Купить токены
/generate <промпт> - Создать видео из текста
/queue - Статус очереди

💰 Ваш баланс: ${Math.floor(user.credits)}₸

📹 Используйте /help для подробных инструкций
  `;

  bot.sendMessage(chatId, welcomeMessage);
}

export async function handleBalance(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const user = db.getUser(userId);
  if (!user) {
    bot.sendMessage(chatId, 'Пожалуйста, используйте /start сначала');
    return;
  }

  const jobs = db.getUserJobs(userId);
  const jobList = jobs.length > 0
    ? jobs.map(j => {
        const statusEmoji = j.status === 'completed' ? '✅' : j.status === 'failed' ? '❌' : j.status === 'processing' ? '⏳' : '⏸️';
        return `${statusEmoji} ${j.status}: ${j.prompt.substring(0, 40)}...`;
      }).join('\n')
    : 'Видео пока нет';

  bot.sendMessage(chatId, `
💰 Баланс: ${Math.floor(user.credits)}₸

📹 Последние видео:
${jobList}

Используйте /buy для покупки токенов
  `);
}

export async function handleBuy(bot, msg) {
  const chatId = msg.chat.id;

  const keyboard = {
    inline_keyboard: [
      [{ text: '💳 Оплата картой (Stripe)', callback_data: 'payment_stripe' }],
      [{ text: '🟣 Оплата через Kaspi', callback_data: 'payment_kaspi' }]
    ]
  };

  const priceInfo = `💳 Выберите способ оплаты:

📦 Доступные пакеты:
• 742 токена — 742₸ (1 видео)
• 1,484 токена — 1,336₸ (2 видео, -10%)
• 3,710 токенов — 3,154₸ (5 видео, -15%)
• 7,420 токенов — 5,936₸ (10 видео, -20%)

📹 Стоимость видео (8 сек):
• Sora-2 (720p): 742₸
• Sora-2 Pro (720p): 1,928₸
• Sora-2 Pro (1080p): 3,115₸

1 токен = 1₸ (тенге)`;

  bot.sendMessage(chatId, priceInfo, { reply_markup: keyboard });
}

export async function handleGenerate(bot, msg, prompt) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const user = db.getUser(userId);
  if (!user) {
    bot.sendMessage(chatId, 'Пожалуйста, используйте /start сначала');
    return;
  }

  if (user.credits < 445) {
    bot.sendMessage(chatId, 'Недостаточно токенов. Используйте /buy для покупки.\n\nМинимальная стоимость видео: 445₸ (Sora-2, 4 сек)');
    return;
  }

  // Save prompt to database and get ID (to avoid 64-byte callback data limit)
  const result = db.savePendingPrompt(userId, prompt);
  const promptId = result.lastInsertRowid;

  // Show configuration options
  const keyboard = {
    inline_keyboard: [
      [{ text: '⚙️ Настроить параметры', callback_data: `cfg_${promptId}` }],
      [{ text: '🚀 Быстро (Sora-2, 8s) - 742₸', callback_data: `quick_sora-2_${promptId}_8_1280x720` }],
      [{ text: '💎 Премиум (Sora-2-Pro, 8s) - 1,928₸', callback_data: `quick_sora-2-pro_${promptId}_8_1280x720` }]
    ]
  };

  bot.sendMessage(chatId, `📹 Создать видео:\n"${prompt}"\n\n💰 Ваш баланс: ${Math.floor(user.credits)} токенов\n\nВыберите вариант:`, {
    reply_markup: keyboard
  });
}

export async function handleHelp(bot, msg) {
  const chatId = msg.chat.id;

  const helpMessage = `📚 Справка по использованию Sora-2 Bot

🎬 **ГЕНЕРАЦИЯ ВИДЕО ИЗ ТЕКСТА**

Команда: /generate <описание>

Примеры:
• /generate A cat playing piano in a jazz club
• /generate Sunset over ocean waves, cinematic shot
• /generate Flying through a neon city at night

💡 Советы для лучших результатов:
• Описывайте тип кадра (wide shot, close-up)
• Укажите действие и обстановку
• Добавьте освещение (golden hour, morning light)

Пример хорошего промпта:
"Wide shot of a child flying a red kite in a grassy park, golden hour sunlight, camera slowly pans upward"

🖼️ **ГЕНЕРАЦИЯ ВИДЕО ИЗ ИЗОБРАЖЕНИЯ**

1. Отправьте боту изображение (фото) с подписью
2. В подписи укажите, что должно произойти в видео
3. Выберите качество (быстро/премиум/настроить)
4. Бот создаст видео, используя ваше фото как первый кадр

Примеры:
• Отправьте фото комнаты с текстом: "Camera slowly pans around"
• Отправьте фото человека: "She turns and smiles"
• Отправьте пейзаж: "Rain starts falling, wind blows"

⚠️ Важно: Изображение должно совпадать с выбранным разрешением видео

⚙️ **ПАРАМЕТРЫ ВИДЕО**

Длительность: 4-12 секунд
Ориентация:
• 📱 Вертикальное (720x1280) - для Stories, Reels
• 🖥️ Горизонтальное (1280x720) - для YouTube
• ⬛ Квадратное (1024x1024) - универсальное

Модели:
• 🚀 Sora-2: быстрая генерация, хорошее качество
• 💎 Sora-2 Pro: высокое качество, для продакшна

💰 **ЦЕНЫ**

Sora-2 (8 сек): 742₸
Sora-2 Pro (8 сек, 720p): 1,928₸
Sora-2 Pro (8 сек, 1080p): 3,115₸

1 токен = 1₸ (тенге)

📦 **ПАКЕТЫ ТОКЕНОВ**

/buy - Купить токены
• 742₸ - 1 видео
• 1,336₸ - 2 видео (скидка 10%)
• 3,154₸ - 5 видео (скидка 15%)
• 5,936₸ - 10 видео (скидка 20%)

Оплата: картой (Stripe) или Kaspi

📊 **ДРУГИЕ КОМАНДЫ**

/balance - Проверить баланс и историю
/queue - Статус текущих задач
/start - Главное меню

❓ **ЧАСТЫЕ ВОПРОСЫ**

Q: Сколько времени генерируется видео?
A: От 2 до 10 минут в зависимости от длительности и модели

Q: Что делать если видео не создалось?
A: Токены автоматически возвращаются на баланс

Q: Можно ли генерировать людей?
A: Нет, API блокирует генерацию реальных людей

Q: Поддерживается ли русский язык в промптах?
A: Лучше использовать английский для точности

💬 По вопросам: @z_dias_c`;

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
}
