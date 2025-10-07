import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'data', 'bot.db');
const db = new Database(dbPath);

console.log('🗑️ Очистка очереди и failed заданий...\n');

try {
  // Get counts before deletion
  const pendingCount = db.prepare("SELECT COUNT(*) as count FROM job_queue WHERE status = 'pending'").get().count;
  const failedCount = db.prepare("SELECT COUNT(*) as count FROM job_queue WHERE status = 'failed'").get().count;
  const processingCount = db.prepare("SELECT COUNT(*) as count FROM job_queue WHERE status = 'processing'").get().count;

  console.log('📊 Текущее состояние:');
  console.log(`   Pending: ${pendingCount}`);
  console.log(`   Failed: ${failedCount}`);
  console.log(`   Processing: ${processingCount}`);
  console.log('');

  // Delete pending jobs
  if (pendingCount > 0) {
    db.prepare("DELETE FROM job_queue WHERE status = 'pending'").run();
    console.log(`✅ Удалено ${pendingCount} pending заданий`);
  }

  // Delete failed jobs
  if (failedCount > 0) {
    db.prepare("DELETE FROM job_queue WHERE status = 'failed'").run();
    console.log(`✅ Удалено ${failedCount} failed заданий`);
  }

  // Optionally delete processing jobs (commented out for safety)
  // if (processingCount > 0) {
  //   db.prepare("DELETE FROM job_queue WHERE status = 'processing'").run();
  //   console.log(`✅ Удалено ${processingCount} processing заданий`);
  // }

  console.log('\n✨ Очередь очищена!');

  // Show final state
  const remainingCount = db.prepare("SELECT COUNT(*) as count FROM job_queue").get().count;
  console.log(`\n📋 Осталось заданий: ${remainingCount}`);

} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}

db.close();
