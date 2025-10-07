import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { db } from './database.js';
import { handleStart, handleBalance, handleBuy, handleGenerate, handleHelp } from './commands.js';
import { handleCallbackQuery } from './callbacks.js';
import { initWorker, getWorkerStats } from './worker.js';

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: {
    interval: 1000,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

// Initialize database
db.init();

// Initialize worker for background job processing
initWorker(bot);

// Set bot commands for menu button
bot.setMyCommands([
  { command: 'start', description: 'Главное меню' },
  { command: 'help', description: 'Справка по использованию' },
  { command: 'generate', description: 'Создать видео из текста' },
  { command: 'balance', description: 'Проверить баланс' },
  { command: 'buy', description: 'Купить токены' },
  { command: 'queue', description: 'Статус очереди' },
]).then(() => {
  console.log('✅ Команды бота установлены');
}).catch(err => {
  console.error('❌ Ошибка установки команд:', err.message);
});

// Admin user ID from environment variable
const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID || '0');

// Command handlers with error catching
bot.onText(/\/start/, (msg) => handleStart(bot, msg).catch(err => console.error('Error in /start:', err.message)));
bot.onText(/\/help/, (msg) => handleHelp(bot, msg).catch(err => console.error('Error in /help:', err.message)));
bot.onText(/\/balance/, (msg) => handleBalance(bot, msg).catch(err => console.error('Error in /balance:', err.message)));
bot.onText(/\/buy/, (msg) => handleBuy(bot, msg).catch(err => console.error('Error in /buy:', err.message)));
bot.onText(/\/generate (.+)/, (msg, match) => handleGenerate(bot, msg, match[1]).catch(err => console.error('Error in /generate:', err.message)));

// Queue status command
bot.onText(/\/queue/, (msg) => {
  const stats = getWorkerStats();
  bot.sendMessage(msg.chat.id, `📊 Статус очереди:

Активных задач: ${stats.activeJobs}
В очереди: ${stats.pendingJobs}
Макс. одновременно: ${stats.maxConcurrent}
Статус: ${stats.isShuttingDown ? 'Завершение работы' : 'Работает'}
  `);
});

// Admin command to show user statistics
bot.onText(/\/users/, (msg) => {
  if (msg.from.id !== ADMIN_USER_ID) {
    bot.sendMessage(msg.chat.id, '❌ У вас нет прав для выполнения этой команды');
    return;
  }

  try {
    const stats = db.getUserStats();
    const users = db.getAllUsers(10); // Get last 10 users

    const recentUsersList = users.map(u => {
      const date = new Date(u.created_at).toLocaleDateString('ru-RU');
      const credits = Math.floor(u.credits);
      return `• @${u.username || 'no_username'} (ID: ${u.user_id})\n  Баланс: ${credits}₸ | Регистрация: ${date}`;
    }).join('\n\n');

    const message = `📊 Статистика пользователей

👥 Всего пользователей: ${stats.totalUsers}
💰 С балансом > 0: ${stats.usersWithCredits}

💳 Общий баланс: ${stats.totalCredits.toLocaleString('ru-RU')}₸
📦 Успешных покупок: ${stats.totalOrders}
💵 Общая выручка: ${Math.floor(stats.totalRevenue).toLocaleString('ru-RU')}₸

🎬 Создано видео: ${stats.totalVideos}

📋 Последние 10 пользователей:

${recentUsersList}`;

    bot.sendMessage(msg.chat.id, message);
  } catch (error) {
    console.error('Error in /users:', error);
    bot.sendMessage(msg.chat.id, `❌ Ошибка: ${error.message}`);
  }
});

// Admin command to topup user balance
bot.onText(/\/topup (@?\w+) (\d+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_USER_ID) {
    bot.sendMessage(msg.chat.id, '❌ У вас нет прав для выполнения этой команды');
    return;
  }

  const username = match[1].replace('@', ''); // Remove @ if present
  const amount = parseInt(match[2]);

  try {
    const users = db.getUserByUsername(username);

    if (users.length === 0) {
      bot.sendMessage(msg.chat.id, `❌ Пользователь @${username} не найден\n\nПользователь должен сначала запустить бота (/start)`);
      return;
    }

    if (users.length > 1) {
      const userList = users.map(u => `- ID: ${u.user_id}, Баланс: ${Math.floor(u.credits)}₸`).join('\n');
      bot.sendMessage(msg.chat.id, `⚠️ Найдено несколько пользователей с username ${username}:\n${userList}`);
      return;
    }

    const user = users[0];
    const oldBalance = Math.floor(user.credits);

    db.updateCredits(user.user_id, amount);

    const updatedUser = db.getUser(user.user_id);
    const newBalance = Math.floor(updatedUser.credits);

    bot.sendMessage(msg.chat.id, `✅ Баланс обновлен

👤 Пользователь: @${user.username}
🆔 ID: ${user.user_id}
💰 Было: ${oldBalance.toLocaleString('ru-RU')}₸
➕ Добавлено: ${amount.toLocaleString('ru-RU')}₸
💳 Стало: ${newBalance.toLocaleString('ru-RU')}₸

📹 Может создать: ~${Math.floor(newBalance / 742)} видео (8 сек, Sora-2)`);

    // Notify user about topup
    bot.sendMessage(user.user_id, `💰 Ваш баланс пополнен!

Добавлено: ${amount.toLocaleString('ru-RU')}₸
Новый баланс: ${newBalance.toLocaleString('ru-RU')}₸

Используйте /generate для создания видео`).catch(() => {
      console.log(`Could not notify user ${user.user_id} about topup`);
    });

  } catch (error) {
    console.error('Error in /topup:', error);
    bot.sendMessage(msg.chat.id, `❌ Ошибка: ${error.message}`);
  }
});

// Photo handler for image-to-video generation
bot.on('photo', async (msg) => {
  try {
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;
    const chatId = msg.chat.id;

    // Get or create user
    let user = db.getUser(userId);
    if (!user) {
      db.createUser(userId, username);
      user = db.getUser(userId);
    }

    // Get the highest resolution photo
    const photo = msg.photo[msg.photo.length - 1];
    const caption = msg.caption || '';

    if (!caption.trim()) {
      bot.sendMessage(chatId, `🖼️ Вы отправили изображение!

Чтобы создать видео из этого изображения, добавьте описание того, что должно произойти в видео.

Например:
• "She turns around and smiles"
• "The camera slowly zooms in"
• "Rain starts falling"

Отправьте изображение еще раз с описанием в подписи.`);
      return;
    }

    // Store prompt and file_id in database (file_id is too long for callback_data)
    const result = db.setPendingPrompt(userId, caption);
    const promptId = result.lastInsertRowid;

    // Store file_id in metadata
    db.updatePendingPromptMetadata(promptId, photo.file_id);

    // Show options with promptId only
    const keyboard = {
      inline_keyboard: [
        [
          { text: '⚡ Быстро (Sora-2)', callback_data: `imgvid_sora2_${promptId}` },
          { text: '💎 Премиум (Sora-2 Pro)', callback_data: `imgvid_pro_${promptId}` }
        ],
        [{ text: '⚙️ Настроить параметры', callback_data: `imgvid_custom_${promptId}` }]
      ]
    };

    bot.sendMessage(chatId, `🖼️➡️🎬 Генерация видео из изображения

📝 Описание: "${caption}"

Выберите качество генерации:`, { reply_markup: keyboard });

  } catch (error) {
    console.error('Error in photo handler:', error.message);
    bot.sendMessage(msg.chat.id, '❌ Ошибка обработки изображения. Попробуйте позже.');
  }
});

// Callback query handler for inline buttons with error catching
bot.on('callback_query', (query) => {
  handleCallbackQuery(bot, query).catch(err => {
    console.error('Error in callback_query:', err.message);
    bot.answerCallbackQuery(query.id, { text: 'Произошла ошибка. Попробуйте позже.' }).catch(() => {});
  });
});

// Error handling with retry logic
let pollingErrorCount = 0;
const MAX_POLLING_ERRORS = 5;

bot.on('polling_error', (error) => {
  pollingErrorCount++;

  // Log different error types differently
  if (error.code === 'EFATAL' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
    // These are temporary network errors - don't spam console
    if (pollingErrorCount === 1) {
      console.warn(`⚠️ Временная сетевая ошибка (${error.code}). Попытка переподключения...`);
    }
  } else if (error.response?.statusCode === 409) {
    console.error('❌ Конфликт: Другой экземпляр бота уже запущен с этим токеном!');
    process.exit(1);
  } else {
    console.error('Ошибка polling:', error.message || error);
  }

  // Exit if too many consecutive errors
  if (pollingErrorCount >= MAX_POLLING_ERRORS) {
    console.error(`❌ Слишком много ошибок подряд (${MAX_POLLING_ERRORS}). Завершение...`);
    process.exit(1);
  }

  // Reset error count after 30 seconds of successful polling
  setTimeout(() => {
    pollingErrorCount = Math.max(0, pollingErrorCount - 1);
  }, 30000);
});

// Reset error count on successful polling
bot.on('message', () => {
  if (pollingErrorCount > 0) {
    console.log('✅ Соединение восстановлено');
    pollingErrorCount = 0;
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Don't exit immediately, give worker time to finish jobs
});

process.on('unhandledRejection', (reason, promise) => {
  // Filter out common network errors that are already handled
  if (reason?.code === 'EFATAL' || reason?.code === 'ETIMEDOUT' || reason?.code === 'ECONNRESET') {
    // These are already logged by polling_error handler
    return;
  }
  console.error('Unhandled rejection:', reason?.message || reason);
});

console.log('🤖 Бот запущен с фоновым воркером...');
