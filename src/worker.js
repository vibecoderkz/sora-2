import dotenv from 'dotenv';
import { db } from './database.js';
import { createVideo, pollVideoStatus, downloadVideo } from './sora.js';
import fs from 'fs';
import canvas from 'canvas';
const { createCanvas, loadImage } = canvas;

dotenv.config();

const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || '1');
const WORKER_POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL || '5000');
const MAX_RETRY_ATTEMPTS = parseInt(process.env.MAX_RETRY_ATTEMPTS || '2');

let bot = null;
let activeJobs = 0;
let isShuttingDown = false;

export function initWorker(telegramBot) {
  bot = telegramBot;
  console.log(`⚙️ Воркер инициализирован с макс. ${MAX_CONCURRENT_JOBS} одновременных задач`);

  // Resume interrupted jobs
  setImmediate(resumeInterruptedJobs);

  // Start the worker loop
  setImmediate(processQueue);

  // Handle graceful shutdown
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

async function gracefulShutdown() {
  if (isShuttingDown) return;

  console.log('\n🛑 Корректное завершение работы воркера...');
  isShuttingDown = true;

  // Wait for active jobs to complete
  while (activeJobs > 0) {
    console.log(`⏳ Ожидание завершения ${activeJobs} активных задач...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('✅ Все задачи завершены. Выход.');
  process.exit(0);
}

async function resumeInterruptedJobs() {
  try {
    const interruptedJobs = db.getProcessingJobs();

    if (interruptedJobs.length > 0) {
      console.log(`🔄 Найдено ${interruptedJobs.length} прерванных заданий, восстанавливаю...`);

      for (const job of interruptedJobs) {
        activeJobs++;
        resumeJob(job).finally(() => {
          activeJobs--;
        });
      }
    }
  } catch (error) {
    console.error('Ошибка при восстановлении прерванных заданий:', error);
  }
}

async function resumeJob(job) {
  console.log(`🔄 Восстановление задачи ${job.id} (Sora ID: ${job.sora_video_id})`);

  try {
    const seconds = job.seconds || '8';
    const size = job.size || '1280x720';
    const sizeLabel = size === '720x1280' ? 'Вертикальное' : size === '1280x720' ? 'Горизонтальное' : 'Квадратное';

    // Poll for completion
    let currentVideo = await pollVideoStatus(job.sora_video_id);
    console.log(`📊 Задача ${job.id} текущий статус: ${currentVideo.status}`);

    while (currentVideo.status === 'queued' || currentVideo.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 5000));
      currentVideo = await pollVideoStatus(job.sora_video_id);
      console.log(`📊 Задача ${job.id} статус: ${currentVideo.status}, прогресс: ${currentVideo.progress || 'N/A'}`);
    }

    console.log(`✅ Задача ${job.id} финальный статус: ${currentVideo.status}`);

    if (currentVideo.status === 'completed') {
      // Download the video
      const filePath = await downloadVideo(job.sora_video_id);

      // Send to user
      const videoType = job.image_file_id ? '🖼️➡️🎬 Видео из изображения' : '🎬 Ваше видео';
      await bot.sendVideo(job.chat_id, filePath, {
        caption: `✅ ${videoType} готово!

📝 Промпт: ${job.prompt}
🎬 Модель: ${job.model}
⏱️ ${seconds} сек | 📐 ${sizeLabel}`
      });

      // Clean up temp file
      fs.unlinkSync(filePath);

      // Mark job as completed
      db.updateJobStatus(job.id, 'completed', {
        completed_at: new Date().toISOString()
      });

      console.log(`✅ Задача ${job.id} успешно завершена после восстановления`);

    } else if (currentVideo.status === 'failed') {
      const errorDetails = currentVideo.error?.message || currentVideo.failure_reason || 'Неизвестная ошибка';
      const errorCode = currentVideo.error?.code || 'UNKNOWN';
      console.error(`❌ Sora API ошибка для задачи ${job.id}: ${errorCode} - ${errorDetails}`);
      throw new Error(`Ошибка Sora API (${errorCode}): ${errorDetails}`);
    }

  } catch (error) {
    console.error(`❌ Ошибка восстановления задачи ${job.id}:`, error);

    // Mark as failed and refund
    db.updateJobStatus(job.id, 'failed', {
      error_message: error.message,
      completed_at: new Date().toISOString()
    });

    const seconds = parseInt(job.seconds || '8');
    const size = job.size || '1280x720';
    const model = job.model || 'sora-2';
    const { getVideoCost } = await import('./pricing.js');
    const cost = getVideoCost(seconds, model, size).credits;

    db.updateCredits(job.user_id, cost);

    await bot.sendMessage(job.chat_id, `❌ Генерация видео не удалась.

${error.message}

💰 Ваши токены возвращены: ${cost}₸`).catch(() => {});
  }
}

async function processQueue() {
  if (isShuttingDown) return;

  try {
    // Check if we can process more jobs
    if (activeJobs < MAX_CONCURRENT_JOBS) {
      const job = db.getNextPendingJob();

      if (job) {
        activeJobs++;
        processJob(job).finally(() => {
          activeJobs--;
        });
      }
    }
  } catch (error) {
    console.error('Error in processQueue:', error);
  }

  // Schedule next iteration
  setTimeout(processQueue, WORKER_POLL_INTERVAL);
}

async function processJob(job) {
  console.log(`⚙️ Обработка задачи ${job.id} для пользователя ${job.user_id}`);

  try {
    // Mark job as processing
    db.updateJobStatus(job.id, 'processing', {
      started_at: new Date().toISOString()
    });

    // Get video parameters
    const seconds = job.seconds || '8';
    const size = job.size || '1280x720';
    const sizeLabel = size === '720x1280' ? 'Вертикальное' : size === '1280x720' ? 'Горизонтальное' : 'Квадратное';

    // Check if this is image-to-video job
    let imageBuffer = null;
    if (job.image_file_id) {
      try {
        // Download image from Telegram
        const fileLink = await bot.getFileLink(job.image_file_id);
        const response = await fetch(fileLink);
        const arrayBuffer = await response.arrayBuffer();
        const originalBuffer = Buffer.from(arrayBuffer);

        // Resize image to match video resolution (required by Sora API)
        const [width, height] = size.split('x').map(Number);
        const image = await loadImage(originalBuffer);

        // Create canvas and draw resized image
        const cvs = createCanvas(width, height);
        const ctx = cvs.getContext('2d');

        // Calculate dimensions to cover (like CSS object-fit: cover)
        const scale = Math.max(width / image.width, height / image.height);
        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;
        const x = (width - scaledWidth) / 2;
        const y = (height - scaledHeight) / 2;

        ctx.drawImage(image, x, y, scaledWidth, scaledHeight);
        imageBuffer = cvs.toBuffer('image/jpeg', { quality: 0.95 });

        console.log(`📷 Загружено и изменено изображение для задачи ${job.id} (${width}x${height})`);
      } catch (error) {
        console.error(`Ошибка обработки изображения:`, error);
        throw new Error('Не удалось обработать изображение');
      }
    }

    // Notify user that processing has started
    const videoType = job.image_file_id ? '🖼️➡️🎬 Видео из изображения' : '🎬 Ваше видео';
    const statusMessage = await bot.sendMessage(job.chat_id, `${videoType} генерируется!

📝 Промпт: ${job.prompt}
🎬 Модель: ${job.model}
⏱️ Длительность: ${seconds} сек
📐 Размер: ${sizeLabel} (${size})

⏳ Статус: Отправка запроса...`);

    // Create video job with Sora API
    const video = await createVideo(job.user_id, job.prompt, job.model, seconds, size, imageBuffer);

    db.updateJobStatus(job.id, 'processing', {
      sora_video_id: video.id
    });

    // Poll for completion
    let currentVideo = video;
    let lastProgress = 0;

    while (currentVideo.status === 'queued' || currentVideo.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 5000));
      currentVideo = await pollVideoStatus(video.id);

      console.log(`📊 Задача ${job.id} статус: ${currentVideo.status}, прогресс: ${currentVideo.progress || 'N/A'}`);

      // Update progress in the same message (only on significant changes)
      if (currentVideo.progress && currentVideo.progress - lastProgress >= 25) {
        lastProgress = currentVideo.progress;
        await bot.editMessageText(`🎬 Ваше видео генерируется!

📝 Промпт: ${job.prompt}
🎬 Модель: ${job.model}
⏱️ Длительность: ${seconds} сек
📐 Размер: ${sizeLabel} (${size})

⏳ Прогресс: ${currentVideo.progress}%`, {
          chat_id: job.chat_id,
          message_id: statusMessage.message_id
        }).catch(() => {});
      }
    }

    console.log(`✅ Задача ${job.id} финальный статус: ${currentVideo.status}`);
    if (currentVideo.status === 'failed') {
      console.log('Ответ видео:', JSON.stringify(currentVideo, null, 2));
    }

    if (currentVideo.status === 'completed') {
      // Delete the status message
      await bot.deleteMessage(job.chat_id, statusMessage.message_id).catch(() => {});

      // Download the video
      const filePath = await downloadVideo(video.id);

      // Send to user
      await bot.sendVideo(job.chat_id, filePath, {
        caption: `✅ Ваше видео готово!

📝 Промпт: ${job.prompt}
🎬 Модель: ${job.model}
⏱️ ${seconds} сек | 📐 ${sizeLabel}`
      });

      // Clean up temp file
      fs.unlinkSync(filePath);

      // Mark job as completed
      db.updateJobStatus(job.id, 'completed', {
        completed_at: new Date().toISOString()
      });

      console.log(`✅ Задача ${job.id} успешно завершена`);

    } else if (currentVideo.status === 'failed') {
      // Extract error details from the video object
      const errorDetails = currentVideo.error?.message || currentVideo.failure_reason || 'Неизвестная ошибка';
      const errorCode = currentVideo.error?.code || 'UNKNOWN';

      console.error(`❌ Sora API ошибка для задачи ${job.id}: ${errorCode} - ${errorDetails}`);
      throw new Error(`Ошибка Sora API (${errorCode}): ${errorDetails}`);
    } else {
      throw new Error(`Неожиданный статус видео: ${currentVideo.status}`);
    }

  } catch (error) {
    console.error(`❌ Ошибка обработки задачи ${job.id}:`, error);

    // Check if error is non-retryable (moderation, billing, invalid input, etc)
    const isNonRetryable = error.message.includes('moderation_blocked') ||
                          error.message.includes('invalid_prompt') ||
                          error.message.includes('content_policy') ||
                          error.message.includes('Billing hard limit') ||
                          error.message.includes('insufficient_quota') ||
                          error.message.includes('rate_limit_exceeded');

    // Check if we should retry
    if (!isNonRetryable && job.retry_count < MAX_RETRY_ATTEMPTS) {
      console.log(`🔄 Повтор задачи ${job.id} (попытка ${job.retry_count + 1}/${MAX_RETRY_ATTEMPTS})`);

      db.updateJobStatus(job.id, 'pending', {
        error_message: error.message,
        retry_count: true
      });

      await bot.sendMessage(job.chat_id, `⚠️ Генерация видео не удалась. Повторная попытка... (Попытка ${job.retry_count + 1}/${MAX_RETRY_ATTEMPTS})`).catch(() => {});
    } else {
      // Max retries exceeded, mark as failed
      db.updateJobStatus(job.id, 'failed', {
        error_message: error.message,
        completed_at: new Date().toISOString()
      });

      // Calculate cost and refund with size parameter
      const seconds = parseInt(job.seconds || '8');
      const size = job.size || '1280x720';
      const model = job.model || 'sora-2';
      const { getVideoCost } = await import('./pricing.js');
      const cost = getVideoCost(seconds, model, size).credits;

      // Refund tokens
      db.updateCredits(job.user_id, cost);

      // Create user-friendly error message
      let userErrorMessage = '';
      if (error.message.includes('Billing hard limit')) {
        userErrorMessage = '⚠️ Сервис временно недоступен: достигнут лимит биллинга API. Пожалуйста, свяжитесь с администратором.';
      } else if (error.message.includes('moderation_blocked')) {
        userErrorMessage = '🚫 Ваш промпт был заблокирован модерацией контента. Пожалуйста, используйте другое описание.';
      } else if (error.message.includes('rate_limit_exceeded')) {
        userErrorMessage = '⏱️ Превышен лимит запросов. Пожалуйста, попробуйте через несколько минут.';
      } else if (error.message.includes('insufficient_quota')) {
        userErrorMessage = '💳 Недостаточно квоты API. Свяжитесь с администратором.';
      } else {
        userErrorMessage = `❌ ${error.message}`;
      }

      const attemptText = isNonRetryable ? '' : ` после ${MAX_RETRY_ATTEMPTS} попыток`;
      await bot.sendMessage(job.chat_id, `❌ Генерация видео не удалась${attemptText}.

${userErrorMessage}

💰 Ваши токены возвращены: ${cost}₸`).catch(() => {});

      console.log(`❌ Задача ${job.id} окончательно провалилась`);
    }
  }
}

export function getWorkerStats() {
  return {
    activeJobs,
    pendingJobs: db.getPendingJobCount(),
    maxConcurrent: MAX_CONCURRENT_JOBS,
    isShuttingDown
  };
}
