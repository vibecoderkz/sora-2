import { db } from './database.js';
import { createCheckoutSession } from './stripe.js';
import { getVideoCost, getCostLabel, canAfford } from './pricing.js';

export async function handleCallbackQuery(bot, query) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  // Handle payment method selection
  if (data.startsWith('payment_')) {
    await handlePaymentMethodCallback(bot, query, data);
  }
  // Handle back to payment
  else if (data === 'back_to_payment') {
    await handlePaymentMethodCallback(bot, query, 'payment_back');
  }
  // Handle buy credits callback
  else if (data.startsWith('buy_')) {
    await handleBuyCallback(bot, query, data);
  }
  // Handle image-to-video callbacks
  else if (data.startsWith('imgvid_')) {
    await handleImageVideoCallback(bot, query, data);
  }
  // Handle image-to-video duration selection
  else if (data.startsWith('imgdur_')) {
    await handleImageDurationCallback(bot, query, data);
  }
  // Handle image-to-video size selection
  else if (data.startsWith('imgsize_')) {
    await handleImageSizeCallback(bot, query, data);
  }
  // Handle image-to-video model selection
  else if (data.startsWith('imgmodel_')) {
    await handleImageModelCallback(bot, query, data);
  }
  // Handle configuration menu
  else if (data.startsWith('cfg_')) {
    await handleConfigCallback(bot, query, data);
  }
  // Handle quick generation
  else if (data.startsWith('quick_')) {
    await handleQuickGenerateCallback(bot, query, data);
  }
  // Handle duration selection
  else if (data.startsWith('dur_')) {
    await handleDurationCallback(bot, query, data);
  }
  // Handle size selection
  else if (data.startsWith('size_')) {
    await handleSizeCallback(bot, query, data);
  }
  // Handle model selection
  else if (data.startsWith('model_')) {
    await handleModelCallback(bot, query, data);
  }
  // Handle old format for backward compatibility
  else if (data.startsWith('gen_')) {
    await handleGenerateCallback(bot, query, data);
  }

  bot.answerCallbackQuery(query.id);
}

// Handle payment method selection
async function handlePaymentMethodCallback(bot, query, data) {
  const chatId = query.message.chat.id;
  const method = data.split('_')[1]; // stripe or kaspi

  if (method === 'stripe') {
    // Show Stripe packages
    const keyboard = {
      inline_keyboard: [
        [{ text: '742 токена за 742₸ (1 видео)', callback_data: 'buy_742_74200' }],
        [{ text: '1,484 токена за 1,336₸ (2 видео, -10%)', callback_data: 'buy_1484_133600' }],
        [{ text: '3,710 токенов за 3,154₸ (5 видео, -15%)', callback_data: 'buy_3710_315400' }],
        [{ text: '7,420 токенов за 5,936₸ (10 видео, -20%)', callback_data: 'buy_7420_593600' }],
        [{ text: '« Назад', callback_data: 'back_to_payment' }]
      ]
    };

    bot.editMessageText('💳 Выберите пакет токенов (оплата картой):', {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: keyboard
    });
  } else if (method === 'kaspi') {
    // Show Kaspi payment instructions
    const username = query.from.username ? `@${query.from.username}` : 'ваш username';

    bot.editMessageText(`🟣 Оплата через Kaspi

📦 Доступные пакеты:
• 742 токена — 742₸
• 1,484 токена — 1,336₸
• 3,710 токенов — 3,154₸
• 7,420 токенов — 5,936₸

💰 Для оплаты:
1. Переведите нужную сумму на Kaspi
2. Напишите администратору @z_dias_c
3. Укажите сумму и ваш username: ${username}

⏱️ Токены будут добавлены в течение 5-10 минут после подтверждения оплаты.`, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: '💬 Написать администратору', url: 'https://t.me/z_dias_c' }],
          [{ text: '« Назад', callback_data: 'back_to_payment' }]
        ]
      }
    });
  } else if (method === 'back') {
    // Go back to payment method selection
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

    bot.editMessageText(priceInfo, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: keyboard
    });
  }
}

async function handleBuyCallback(bot, query, data) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  const parts = data.split('_');
  const credits = parseInt(parts[1]);
  const amount = parseInt(parts[2]); // amount in tiyins (1/100 tenge)

  try {
    const session = await createCheckoutSession(userId, credits, amount);

    bot.sendMessage(chatId, `💳 Ссылка на оплату создана!

📦 Токенов: ${credits.toLocaleString('ru-RU')}
💰 Сумма: ${(amount / 100).toLocaleString('ru-RU')}₸

🔗 Нажмите для оплаты:
${session.url}

✅ Токены будут автоматически добавлены после успешной оплаты.`);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    bot.sendMessage(chatId, 'Ошибка создания ссылки на оплату. Попробуйте позже.');
  }
}

// Configuration menu - step 1: choose duration
async function handleConfigCallback(bot, query, data) {
  const chatId = query.message.chat.id;
  const promptId = data.split('_')[1];

  const keyboard = {
    inline_keyboard: [
      [{ text: '⚡ 4 сек (от 445₸)', callback_data: `dur_${promptId}_4` }],
      [{ text: '🎬 6 сек (от 594₸)', callback_data: `dur_${promptId}_6` }],
      [{ text: '⭐ 8 сек (от 742₸)', callback_data: `dur_${promptId}_8` }],
      [{ text: '🎥 10 сек (от 890₸)', callback_data: `dur_${promptId}_10` }],
      [{ text: '🎞️ 12 сек (от 1,039₸)', callback_data: `dur_${promptId}_12` }]
    ]
  };

  bot.editMessageText('⏱️ Выберите длительность видео:', {
    chat_id: chatId,
    message_id: query.message.message_id,
    reply_markup: keyboard
  });
}

// Step 2: choose size
async function handleDurationCallback(bot, query, data) {
  const chatId = query.message.chat.id;
  const parts = data.split('_');
  const promptId = parts[1];
  const seconds = parts[2];

  const keyboard = {
    inline_keyboard: [
      [{ text: '📱 Вертикальное 720p', callback_data: `size_${promptId}_${seconds}_720x1280` }],
      [{ text: '🖥️ Горизонтальное 720p', callback_data: `size_${promptId}_${seconds}_1280x720` }],
      [{ text: '⬛ Квадратное 720p', callback_data: `size_${promptId}_${seconds}_1024x1024` }]
    ]
  };

  bot.editMessageText(`⏱️ Длительность: ${seconds} сек\n\n📐 Выберите ориентацию видео:`, {
    chat_id: chatId,
    message_id: query.message.message_id,
    reply_markup: keyboard
  });
}

// Step 3: choose model
async function handleSizeCallback(bot, query, data) {
  const chatId = query.message.chat.id;
  const parts = data.split('_');
  const promptId = parts[1];
  const seconds = parts[2];
  const size = parts[3];

  const fastCost = getCostLabel(seconds, 'sora-2', size);
  const proCost = getCostLabel(seconds, 'sora-2-pro', size);

  const keyboard = {
    inline_keyboard: [
      [{ text: `🚀 Sora-2 — ${fastCost}`, callback_data: `model_${promptId}_${seconds}_${size}_sora-2` }],
      [{ text: `💎 Sora-2 Pro — ${proCost}`, callback_data: `model_${promptId}_${seconds}_${size}_sora-2-pro` }]
    ]
  };

  const sizeLabel = size === '720x1280' ? '📱 Вертикальное' : size === '1280x720' ? '🖥️ Горизонтальное' : '⬛ Квадратное';

  bot.editMessageText(`✨ Параметры видео:

⏱️ Длительность: ${seconds} сек
${sizeLabel}

🎬 Выберите качество:`, {
    chat_id: chatId,
    message_id: query.message.message_id,
    reply_markup: keyboard
  });
}

// Final step: enqueue with all parameters
async function handleModelCallback(bot, query, data) {
  await enqueueVideoJob(bot, query, data);
}

// Quick generation with default/preset parameters
async function handleQuickGenerateCallback(bot, query, data) {
  await enqueueVideoJob(bot, query, data);
}

// Old format for backward compatibility
async function handleGenerateCallback(bot, query, data) {
  const parts = data.split('_');
  // Convert old format: gen_model_promptId to quick_model_promptId_8_1280x720
  const model = parts[1];
  const promptId = parts[2];
  const newData = `quick_${model}_${promptId}_8_1280x720`;
  await enqueueVideoJob(bot, query, newData);
}

// Common function to enqueue job with parameters
async function enqueueVideoJob(bot, query, data) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  // Parse: quick_model_promptId_seconds_size OR model_promptId_seconds_size_model
  const parts = data.split('_');
  let model, promptId, seconds, size;

  if (parts[0] === 'quick') {
    model = parts[1];
    promptId = parseInt(parts[2]);
    seconds = parts[3];
    size = parts[4];
  } else if (parts[0] === 'model') {
    promptId = parseInt(parts[1]);
    seconds = parts[2];
    size = parts[3];
    model = parts[4];
  }

  // Retrieve prompt from database
  const pendingPrompt = db.getPendingPrompt(promptId, userId);

  if (!pendingPrompt) {
    bot.sendMessage(chatId, '❌ Промпт истёк или недействителен. Попробуйте /generate снова.');
    return;
  }

  const prompt = pendingPrompt.prompt;
  const user = db.getUser(userId);

  // Calculate video cost with size parameter
  const videoCost = getVideoCost(seconds, model, size);

  // Check if user has enough tokens
  if (!canAfford(user.credits, seconds, model, size)) {
    bot.sendMessage(chatId, `❌ Недостаточно токенов!

💰 У вас: ${Math.floor(user.credits)} токенов
💳 Требуется: ${videoCost.formatted} токенов
📉 Не хватает: ${Math.floor(videoCost.credits - user.credits)} токенов

Используйте /buy для покупки токенов.`);
    return;
  }

  // Deduct tokens for video cost
  db.updateCredits(userId, -videoCost.credits);

  // Enqueue the job with parameters
  const result = db.enqueueJobWithParams(userId, chatId, prompt, model, seconds, size);
  const jobId = result.lastInsertRowid;

  // Delete the pending prompt
  db.deletePendingPrompt(promptId);

  // Get queue position
  const pendingCount = db.getPendingJobCount();
  const position = pendingCount;

  const sizeLabel = size === '720x1280' ? 'Вертикальное' : size === '1280x720' ? 'Горизонтальное' : 'Квадратное';
  const newBalance = user.credits - videoCost.credits;

  await bot.sendMessage(chatId, `✅ Видео добавлено в очередь!

📋 ID задания: ${jobId}
🎬 Модель: ${model}
⏱️ Длительность: ${seconds} сек
📐 Размер: ${sizeLabel} (${size})
💳 Стоимость: ${videoCost.formatted}₸
💰 Новый баланс: ${Math.floor(newBalance)}₸
📝 Промпт: ${prompt}
📊 Позиция в очереди: ${position > 1 ? `#${position}` : 'Следующий'}

Вы получите уведомление когда видео будет готово. Это может занять несколько минут в зависимости от очереди.`);
}

// Handle image-to-video callbacks
async function handleImageVideoCallback(bot, query, data) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  // Parse: imgvid_<preset>_<promptId>
  const parts = data.split('_');
  const preset = parts[1]; // sora2, pro, custom
  const promptId = parseInt(parts[2]); // promptId from database

  // Get pending prompt with metadata (file_id)
  const pendingPrompt = db.getPendingPrompt(promptId, userId);
  if (!pendingPrompt) {
    bot.sendMessage(chatId, '❌ Описание истекло. Отправьте изображение еще раз с описанием.');
    return;
  }

  const prompt = pendingPrompt.prompt;
  const fileId = pendingPrompt.metadata; // file_id stored in metadata

  if (!fileId) {
    bot.sendMessage(chatId, '❌ Изображение не найдено. Отправьте изображение еще раз.');
    return;
  }

  if (preset === 'sora2') {
    // Quick: Sora-2, 8 sec, 1280x720
    await enqueueImageVideoJob(bot, chatId, userId, fileId, prompt, 'sora-2', '8', '1280x720', promptId);
  } else if (preset === 'pro') {
    // Quick: Sora-2 Pro, 8 sec, 1280x720
    await enqueueImageVideoJob(bot, chatId, userId, fileId, prompt, 'sora-2-pro', '8', '1280x720', promptId);
  } else if (preset === 'custom') {
    // Show custom configuration menu
    const keyboard = {
      inline_keyboard: [
        [{ text: '⚡ 4 сек (от 445₸)', callback_data: `imgdur_${promptId}_4` }],
        [{ text: '🎬 6 сек (от 594₸)', callback_data: `imgdur_${promptId}_6` }],
        [{ text: '⭐ 8 сек (от 742₸)', callback_data: `imgdur_${promptId}_8` }],
        [{ text: '🎥 10 сек (от 890₸)', callback_data: `imgdur_${promptId}_10` }],
        [{ text: '🎞️ 12 сек (от 1,039₸)', callback_data: `imgdur_${promptId}_12` }]
      ]
    };

    bot.editMessageText('⏱️ Выберите длительность видео:', {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: keyboard
    });
  }
}

// Enqueue image-to-video job
async function enqueueImageVideoJob(bot, chatId, userId, fileId, prompt, model, seconds, size, promptId) {
  const user = db.getUser(userId);

  // Calculate video cost
  const videoCost = getVideoCost(seconds, model, size);

  // Check if user has enough tokens
  if (!canAfford(user.credits, seconds, model, size)) {
    bot.sendMessage(chatId, `❌ Недостаточно токенов!

💰 У вас: ${Math.floor(user.credits)} токенов
💳 Требуется: ${videoCost.formatted} токенов
📉 Не хватает: ${Math.floor(videoCost.credits - user.credits)} токенов

Используйте /buy для покупки токенов.`);
    return;
  }

  // Deduct tokens
  db.updateCredits(userId, -videoCost.credits);

  // Enqueue job with file_id
  const result = db.enqueueImageVideoJob(userId, chatId, prompt, model, seconds, size, fileId);
  const jobId = result.lastInsertRowid;

  // Delete pending prompt
  db.deletePendingPrompt(promptId);

  const pendingCount = db.getPendingJobCount();
  const sizeLabel = size === '720x1280' ? 'Вертикальное' : size === '1280x720' ? 'Горизонтальное' : 'Квадратное';
  const newBalance = user.credits - videoCost.credits;

  await bot.sendMessage(chatId, `✅ Видео из изображения добавлено в очередь!

🖼️➡️🎬 Генерация из изображения
📋 ID задания: ${jobId}
🎬 Модель: ${model}
⏱️ Длительность: ${seconds} сек
📐 Размер: ${sizeLabel} (${size})
💳 Стоимость: ${videoCost.formatted}₸
💰 Новый баланс: ${Math.floor(newBalance)}₸
📝 Описание: ${prompt}
📊 Позиция в очереди: ${pendingCount > 1 ? `#${pendingCount}` : 'Следующий'}

Вы получите уведомление когда видео будет готово.`);
}

// Handle image-to-video duration selection
async function handleImageDurationCallback(bot, query, data) {
  const chatId = query.message.chat.id;
  const parts = data.split('_');
  const promptId = parts[1];
  const seconds = parts[2];

  const keyboard = {
    inline_keyboard: [
      [{ text: '📱 Вертикальное 720p', callback_data: `imgsize_${promptId}_${seconds}_720x1280` }],
      [{ text: '🖥️ Горизонтальное 720p', callback_data: `imgsize_${promptId}_${seconds}_1280x720` }],
      [{ text: '⬛ Квадратное 720p', callback_data: `imgsize_${promptId}_${seconds}_1024x1024` }]
    ]
  };

  bot.editMessageText(`⏱️ Длительность: ${seconds} сек\n\n📐 Выберите ориентацию видео:`, {
    chat_id: chatId,
    message_id: query.message.message_id,
    reply_markup: keyboard
  });
}

// Handle image-to-video size selection
async function handleImageSizeCallback(bot, query, data) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const parts = data.split('_');
  const promptId = parts[1];
  const seconds = parts[2];
  const size = parts[3];

  const fastCost = getCostLabel(seconds, 'sora-2', size);
  const proCost = getCostLabel(seconds, 'sora-2-pro', size);

  const keyboard = {
    inline_keyboard: [
      [{ text: `🚀 Sora-2 — ${fastCost}`, callback_data: `imgmodel_${promptId}_${seconds}_${size}_sora-2` }],
      [{ text: `💎 Sora-2 Pro — ${proCost}`, callback_data: `imgmodel_${promptId}_${seconds}_${size}_sora-2-pro` }]
    ]
  };

  const sizeLabel = size === '720x1280' ? '📱 Вертикальное' : size === '1280x720' ? '🖥️ Горизонтальное' : '⬛ Квадратное';

  bot.editMessageText(`✨ Параметры видео:

⏱️ Длительность: ${seconds} сек
${sizeLabel}

🎬 Выберите качество:`, {
    chat_id: chatId,
    message_id: query.message.message_id,
    reply_markup: keyboard
  });
}

// Handle image-to-video model selection - final step
async function handleImageModelCallback(bot, query, data) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  // Parse: imgmodel_promptId_seconds_size_model
  const parts = data.split('_');
  const promptId = parseInt(parts[1]);
  const seconds = parts[2];
  const size = parts[3];
  const model = parts[4];

  // Get pending prompt with file_id
  const pendingPrompt = db.getPendingPrompt(promptId, userId);
  if (!pendingPrompt) {
    bot.sendMessage(chatId, '❌ Описание истекло. Отправьте изображение еще раз с описанием.');
    return;
  }

  const prompt = pendingPrompt.prompt;
  const fileId = pendingPrompt.metadata;

  if (!fileId) {
    bot.sendMessage(chatId, '❌ Изображение не найдено. Отправьте изображение еще раз.');
    return;
  }

  // Enqueue the job
  await enqueueImageVideoJob(bot, chatId, userId, fileId, prompt, model, seconds, size, promptId);
}
