import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure data directory exists
const dataDir = join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'bot.db');
const sqlite = new Database(dbPath);

export const db = {
  init() {
    // Users table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        username TEXT,
        credits REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        stripe_session_id TEXT,
        amount INTEGER,
        credits INTEGER,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )
    `);

    // Videos table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        video_id TEXT,
        prompt TEXT,
        model TEXT,
        status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )
    `);

    // Job queue table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS job_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        chat_id INTEGER,
        prompt TEXT,
        model TEXT,
        seconds TEXT DEFAULT '8',
        size TEXT DEFAULT '1280x720',
        status TEXT DEFAULT 'pending',
        sora_video_id TEXT,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        image_file_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )
    `);

    // Pending prompts table (temporary storage for callback data)
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS pending_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        prompt TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )
    `);

    console.log('Database initialized');
  },

  getUser(userId) {
    const stmt = sqlite.prepare('SELECT * FROM users WHERE user_id = ?');
    return stmt.get(userId);
  },

  getUserByUsername(username) {
    const stmt = sqlite.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.all(username);
  },

  createUser(userId, username) {
    const stmt = sqlite.prepare('INSERT INTO users (user_id, username) VALUES (?, ?)');
    stmt.run(userId, username);
  },

  updateCredits(userId, credits) {
    const stmt = sqlite.prepare('UPDATE users SET credits = credits + ? WHERE user_id = ?');
    stmt.run(credits, userId);
  },

  createOrder(userId, sessionId, amount, credits) {
    const stmt = sqlite.prepare(
      'INSERT INTO orders (user_id, stripe_session_id, amount, credits) VALUES (?, ?, ?, ?)'
    );
    return stmt.run(userId, sessionId, amount, credits);
  },

  updateOrderStatus(sessionId, status) {
    const stmt = sqlite.prepare('UPDATE orders SET status = ? WHERE stripe_session_id = ?');
    stmt.run(status, sessionId);
  },

  getOrder(sessionId) {
    const stmt = sqlite.prepare('SELECT * FROM orders WHERE stripe_session_id = ?');
    return stmt.get(sessionId);
  },

  createVideo(userId, videoId, prompt, model) {
    const stmt = sqlite.prepare(
      'INSERT INTO videos (user_id, video_id, prompt, model, status) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(userId, videoId, prompt, model, 'queued');
  },

  updateVideoStatus(videoId, status) {
    const stmt = sqlite.prepare('UPDATE videos SET status = ? WHERE video_id = ?');
    stmt.run(status, videoId);
  },

  getUserVideos(userId) {
    const stmt = sqlite.prepare('SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC LIMIT 10');
    return stmt.all(userId);
  },

  // Queue management methods
  enqueueJob(userId, chatId, prompt, model) {
    const stmt = sqlite.prepare(
      'INSERT INTO job_queue (user_id, chat_id, prompt, model) VALUES (?, ?, ?, ?)'
    );
    return stmt.run(userId, chatId, prompt, model);
  },

  enqueueJobWithParams(userId, chatId, prompt, model, seconds, size) {
    const stmt = sqlite.prepare(
      'INSERT INTO job_queue (user_id, chat_id, prompt, model, seconds, size) VALUES (?, ?, ?, ?, ?, ?)'
    );
    return stmt.run(userId, chatId, prompt, model, seconds, size);
  },

  getNextPendingJob() {
    const stmt = sqlite.prepare(
      "SELECT * FROM job_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
    );
    return stmt.get();
  },

  getProcessingJobs() {
    const stmt = sqlite.prepare(
      "SELECT * FROM job_queue WHERE status = 'processing' AND sora_video_id IS NOT NULL ORDER BY created_at ASC"
    );
    return stmt.all();
  },

  getJobById(jobId) {
    const stmt = sqlite.prepare('SELECT * FROM job_queue WHERE id = ?');
    return stmt.get(jobId);
  },

  updateJobStatus(jobId, status, extraFields = {}) {
    let query = 'UPDATE job_queue SET status = ?';
    const params = [status];

    if (extraFields.sora_video_id) {
      query += ', sora_video_id = ?';
      params.push(extraFields.sora_video_id);
    }
    if (extraFields.error_message) {
      query += ', error_message = ?';
      params.push(extraFields.error_message);
    }
    if (extraFields.started_at !== undefined) {
      query += ', started_at = ?';
      params.push(extraFields.started_at);
    }
    if (extraFields.completed_at !== undefined) {
      query += ', completed_at = ?';
      params.push(extraFields.completed_at);
    }
    if (extraFields.retry_count !== undefined) {
      query += ', retry_count = retry_count + 1';
    }

    query += ' WHERE id = ?';
    params.push(jobId);

    const stmt = sqlite.prepare(query);
    stmt.run(...params);
  },

  getUserJobs(userId, limit = 10) {
    const stmt = sqlite.prepare(
      'SELECT * FROM job_queue WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    );
    return stmt.all(userId, limit);
  },

  getPendingJobCount() {
    const stmt = sqlite.prepare("SELECT COUNT(*) as count FROM job_queue WHERE status = 'pending'");
    return stmt.get().count;
  },

  // Pending prompts methods (for handling large callback data)
  savePendingPrompt(userId, prompt) {
    const stmt = sqlite.prepare('INSERT INTO pending_prompts (user_id, prompt) VALUES (?, ?)');
    return stmt.run(userId, prompt);
  },

  setPendingPrompt(userId, prompt) {
    const stmt = sqlite.prepare('INSERT INTO pending_prompts (user_id, prompt) VALUES (?, ?)');
    return stmt.run(userId, prompt);
  },

  getPendingPrompt(promptId, userId) {
    const stmt = sqlite.prepare('SELECT * FROM pending_prompts WHERE id = ? AND user_id = ?');
    return stmt.get(promptId, userId);
  },

  getPendingPromptsByUserId(userId) {
    const stmt = sqlite.prepare('SELECT * FROM pending_prompts WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId);
  },

  updatePendingPromptMetadata(promptId, metadata) {
    const stmt = sqlite.prepare('UPDATE pending_prompts SET metadata = ? WHERE id = ?');
    stmt.run(metadata, promptId);
  },

  deletePendingPrompt(promptId) {
    const stmt = sqlite.prepare('DELETE FROM pending_prompts WHERE id = ?');
    stmt.run(promptId);
  },

  // Image-to-video job
  enqueueImageVideoJob(userId, chatId, prompt, model, seconds, size, imageFileId) {
    const stmt = sqlite.prepare(
      'INSERT INTO job_queue (user_id, chat_id, prompt, model, seconds, size, image_file_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    return stmt.run(userId, chatId, prompt, model, seconds, size, imageFileId);
  },

  // Admin stats
  getUserStats() {
    const totalUsers = sqlite.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const usersWithCredits = sqlite.prepare('SELECT COUNT(*) as count FROM users WHERE credits > 0').get().count;
    const totalCredits = sqlite.prepare('SELECT SUM(credits) as total FROM users').get().total || 0;
    const totalOrders = sqlite.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'").get().count;
    const totalRevenue = sqlite.prepare("SELECT SUM(amount) as total FROM orders WHERE status = 'completed'").get().total || 0;
    const totalVideos = sqlite.prepare("SELECT COUNT(*) as count FROM job_queue WHERE status = 'completed'").get().count;

    return {
      totalUsers,
      usersWithCredits,
      totalCredits: Math.floor(totalCredits),
      totalOrders,
      totalRevenue: totalRevenue / 100, // Convert from tiyins to tenge
      totalVideos
    };
  },

  getAllUsers(limit = 50, offset = 0) {
    const stmt = sqlite.prepare('SELECT user_id, username, credits, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?');
    return stmt.all(limit, offset);
  }
};
