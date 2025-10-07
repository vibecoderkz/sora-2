import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'data', 'bot.db');
const db = new Database(dbPath);

console.log('🔄 Миграция: Добавление поддержки image-to-video...');

try {
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(job_queue)").all();
  const hasImageFileId = tableInfo.some(col => col.name === 'image_file_id');

  if (!hasImageFileId) {
    console.log('➕ Добавление колонки image_file_id в job_queue...');
    db.prepare("ALTER TABLE job_queue ADD COLUMN image_file_id TEXT").run();
    console.log('✅ Колонка image_file_id добавлена');
  } else {
    console.log('✓ Колонка image_file_id уже существует');
  }

  // Check pending_prompts table
  const promptTableInfo = db.prepare("PRAGMA table_info(pending_prompts)").all();
  const hasMetadata = promptTableInfo.some(col => col.name === 'metadata');

  if (!hasMetadata) {
    console.log('➕ Добавление колонки metadata в pending_prompts...');
    db.prepare("ALTER TABLE pending_prompts ADD COLUMN metadata TEXT").run();
    console.log('✅ Колонка metadata добавлена');
  } else {
    console.log('✓ Колонка metadata уже существует');
  }

  console.log('\n✅ Миграция завершена успешно!');
} catch (error) {
  console.error('❌ Ошибка миграции:', error.message);
  process.exit(1);
}

db.close();
