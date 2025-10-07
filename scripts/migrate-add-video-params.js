import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'data', 'bot.db');
const db = new Database(dbPath);

console.log('🔄 Adding seconds and size columns to job_queue table...');

try {
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(job_queue)").all();
  const hasSeconds = tableInfo.some(col => col.name === 'seconds');
  const hasSize = tableInfo.some(col => col.name === 'size');

  if (!hasSeconds) {
    db.prepare("ALTER TABLE job_queue ADD COLUMN seconds TEXT DEFAULT '8'").run();
    console.log('✅ Added seconds column');
  } else {
    console.log('⏭️  seconds column already exists');
  }

  if (!hasSize) {
    db.prepare("ALTER TABLE job_queue ADD COLUMN size TEXT DEFAULT '1280x720'").run();
    console.log('✅ Added size column');
  } else {
    console.log('⏭️  size column already exists');
  }

  console.log('✅ Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

db.close();
