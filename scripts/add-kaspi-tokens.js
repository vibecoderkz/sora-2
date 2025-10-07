import { db } from './src/database.js';

const username = process.argv[2]; // Без @
const amount = parseInt(process.argv[3]);

if (!username || !amount) {
  console.log('Использование: node add-kaspi-tokens.js <username> <amount>');
  console.log('');
  console.log('Примеры:');
  console.log('  node add-kaspi-tokens.js ivan_petrov 742    # Пакет 1');
  console.log('  node add-kaspi-tokens.js ivan_petrov 1484   # Пакет 2');
  console.log('  node add-kaspi-tokens.js ivan_petrov 3710   # Пакет 3');
  console.log('  node add-kaspi-tokens.js ivan_petrov 7420   # Пакет 4');
  console.log('');
  console.log('Пакеты:');
  console.log('  742 токена за 742₸');
  console.log('  1,484 токена за 1,336₸');
  console.log('  3,710 токенов за 3,154₸');
  console.log('  7,420 токенов за 5,936₸');
  process.exit(1);
}

db.init();

const users = db.getUserByUsername(username);

if (users.length === 0) {
  console.log(`❌ Пользователь ${username} не найден`);
  console.log('');
  console.log('Возможные причины:');
  console.log('  • Пользователь еще не запустил бота (/start)');
  console.log('  • Username указан неправильно (без @ символа)');
  process.exit(1);
}

if (users.length > 1) {
  console.log(`⚠️ Найдено несколько пользователей с username ${username}:`);
  users.forEach(user => {
    console.log(`  - user_id: ${user.user_id}, credits: ${Math.floor(user.credits)}₸`);
  });
  process.exit(1);
}

const user = users[0];
console.log('═══════════════════════════════════════');
console.log(`👤 Пользователь: @${user.username}`);
console.log(`🆔 ID: ${user.user_id}`);
console.log(`💰 Текущий баланс: ${Math.floor(user.credits)}₸`);
console.log('═══════════════════════════════════════');

db.updateCredits(user.user_id, amount);

const updatedUser = db.getUser(user.user_id);
console.log(`✅ Успешно добавлено: ${amount.toLocaleString('ru-RU')}₸`);
console.log(`💳 Новый баланс: ${Math.floor(updatedUser.credits).toLocaleString('ru-RU')}₸`);
console.log('═══════════════════════════════════════');

// Calculate how many videos user can create
const videoCost = 742; // Standard 8 sec video
const videos = Math.floor(updatedUser.credits / videoCost);
console.log(`📹 Может создать: ~${videos} видео (8 сек, Sora-2)`);
console.log('');
