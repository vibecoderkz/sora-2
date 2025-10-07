# 🟣 Инструкция по оплате через Kaspi

## Для пользователей

Когда пользователь выбирает "Оплата через Kaspi" в боте, он видит:

```
🟣 Оплата через Kaspi

📦 Доступные пакеты:
• 742 токена — 742₸
• 1,484 токена — 1,336₸
• 3,710 токенов — 3,154₸
• 7,420 токенов — 5,936₸

💰 Для оплаты:
1. Переведите нужную сумму на Kaspi
2. Напишите администратору @z_dias_c
3. Укажите сумму и ваш username

⏱️ Токены будут добавлены в течение 5-10 минут после подтверждения оплаты.

[💬 Написать администратору] [« Назад]
```

## Для администратора (@z_dias_c)

### Шаг 1: Получение платежа

Пользователь должен написать вам в личные сообщения со следующей информацией:
- Сумма перевода
- Свой Telegram username (или ID)
- Какой пакет токенов он хочет

**Пример сообщения от пользователя:**
```
Здравствуйте! Перевел 1,336₸ на Kaspi.
Мой username: @ivan_petrov
Хочу получить 1,484 токена (пакет на 2 видео)
```

### Шаг 2: Проверка платежа

1. Проверьте, что платеж действительно пришел на ваш Kaspi
2. Сверьте сумму с пакетами:
   - 742₸ → 742 токена
   - 1,336₸ → 1,484 токена
   - 3,154₸ → 3,710 токенов
   - 5,936₸ → 7,420 токенов

### Шаг 3: Добавление токенов

Используйте команду Node.js для добавления токенов:

```bash
node -e "
import('./src/database.js').then(({ db }) => {
  db.init();
  const username = 'ivan_petrov';  // Без @
  const amount = 1484;  // Количество токенов

  const users = db.getUserByUsername(username);

  if (users.length === 0) {
    console.log('❌ Пользователь не найден');
    process.exit(1);
  }

  const user = users[0];
  console.log(\`👤 Пользователь: \${user.username} (ID: \${user.user_id})\`);
  console.log(\`💰 Текущий баланс: \${Math.floor(user.credits)}₸\`);

  db.updateCredits(user.user_id, amount);

  const updatedUser = db.getUser(user.user_id);
  console.log(\`✅ Добавлено: \${amount}₸\`);
  console.log(\`💳 Новый баланс: \${Math.floor(updatedUser.credits)}₸\`);
});
"
```

### Шаг 4: Уведомление пользователя

После успешного добавления токенов, отправьте пользователю подтверждение:

```
✅ Оплата подтверждена!

💰 На ваш баланс добавлено: 1,484 токена
📦 Вы можете создать: 2 видео (8 сек, Sora-2)

Используйте команду /balance для проверки баланса
Используйте /generate для создания видео
```

## Быстрые команды для администратора

### Проверить баланс пользователя
```bash
node -e "
import('./src/database.js').then(({ db }) => {
  db.init();
  const users = db.getUserByUsername('username');
  if (users.length > 0) {
    console.log('Баланс:', users[0].credits, 'токенов');
  }
});
"
```

### Добавить токены
```bash
# Для пакета 1 (742 токена за 742₸)
node -e "import('./src/database.js').then(({ db }) => { db.init(); const u = db.getUserByUsername('username')[0]; db.updateCredits(u.user_id, 742); });"

# Для пакета 2 (1,484 токена за 1,336₸)
node -e "import('./src/database.js').then(({ db }) => { db.init(); const u = db.getUserByUsername('username')[0]; db.updateCredits(u.user_id, 1484); });"

# Для пакета 3 (3,710 токенов за 3,154₸)
node -e "import('./src/database.js').then(({ db }) => { db.init(); const u = db.getUserByUsername('username')[0]; db.updateCredits(u.user_id, 3710); });"

# Для пакета 4 (7,420 токенов за 5,936₸)
node -e "import('./src/database.js').then(({ db }) => { db.init(); const u = db.getUserByUsername('username')[0]; db.updateCredits(u.user_id, 7420); });"
```

### Список всех пользователей с балансом
```bash
node -e "
import('./src/database.js').then(({ db }) => {
  db.init();
  const sqlite = db.sqlite || (await import('./src/database.js')).default;
  const users = db.sqlite.prepare('SELECT * FROM users WHERE credits > 0 ORDER BY credits DESC').all();
  users.forEach(u => console.log(\`\${u.username}: \${u.credits}₸\`));
});
"
```

## Создание удобного скрипта

Создайте файл `add-kaspi-tokens.js` для быстрого добавления:

```javascript
import { db } from './src/database.js';

const username = process.argv[2]; // Без @
const amount = parseInt(process.argv[3]);

if (!username || !amount) {
  console.log('Использование: node add-kaspi-tokens.js <username> <amount>');
  console.log('Пример: node add-kaspi-tokens.js ivan_petrov 1484');
  process.exit(1);
}

db.init();

const users = db.getUserByUsername(username);

if (users.length === 0) {
  console.log(`❌ Пользователь ${username} не найден`);
  process.exit(1);
}

const user = users[0];
console.log(`👤 Пользователь: ${user.username} (ID: ${user.user_id})`);
console.log(`💰 Текущий баланс: ${Math.floor(user.credits)}₸`);

db.updateCredits(user.user_id, amount);

const updatedUser = db.getUser(user.user_id);
console.log(`✅ Добавлено: ${amount}₸`);
console.log(`💳 Новый баланс: ${Math.floor(updatedUser.credits)}₸`);
```

**Использование:**
```bash
node add-kaspi-tokens.js ivan_petrov 1484
```

## Частые проблемы

### Пользователь не найден
- Убедитесь, что пользователь хотя бы раз запустил бота (`/start`)
- Username нужно указывать БЕЗ символа `@`
- Проверьте правильность написания username

### Неправильная сумма
- Сверьте сумму платежа с таблицей пакетов
- Если пользователь перевел другую сумму, договоритесь о компенсации или возврате

### Пользователь не получил токены
1. Проверьте баланс: `/balance` в боте
2. Проверьте базу данных вручную
3. Убедитесь, что скрипт выполнился успешно (нет ошибок)

## Статистика платежей

Для отслеживания всех платежей Kaspi рекомендуется вести простую таблицу:

| Дата | Username | Сумма | Токенов | Статус |
|------|----------|-------|---------|--------|
| 07.10.2025 | ivan_petrov | 1,336₸ | 1,484 | ✅ Добавлено |
| 07.10.2025 | maria_k | 742₸ | 742 | ✅ Добавлено |

Это поможет при возникновении споров или вопросов от пользователей.
