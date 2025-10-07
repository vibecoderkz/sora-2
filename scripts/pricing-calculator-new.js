// Real Sora API costs from photo
const SORA_COSTS_USD = {
  'sora-2': {
    '720x1280': 0.10,  // 720p portrait
    '1280x720': 0.10,  // 720p landscape
    '1024x1024': 0.10, // 720p square
  },
  'sora-2-pro': {
    '720x1280': 0.30,  // 720p portrait
    '1280x720': 0.30,  // 720p landscape
    '1024x1024': 0.30, // 720p square
    '1024x1792': 0.50, // 1080p portrait
    '1792x1024': 0.50, // 1080p landscape
  }
};

const USD_TO_KZT = 480;
const PROFIT_MARGIN = 1.5; // 50% profit
const STRIPE_PERCENT = 0.029; // 2.9%
const STRIPE_FIXED_USD = 0.30;

function calculateSellingPrice(seconds, model, size) {
  const costPerSecondUSD = SORA_COSTS_USD[model][size];
  const totalCostUSD = seconds * costPerSecondUSD;
  const totalCostKZT = totalCostUSD * USD_TO_KZT;

  // Add profit margin
  const priceWithProfit = totalCostKZT * PROFIT_MARGIN;

  // Account for Stripe fees: final_price = (price_with_profit + stripe_fixed) / (1 - stripe_percent)
  const stripeFeeKZT = STRIPE_FIXED_USD * USD_TO_KZT;
  const finalPrice = (priceWithProfit + stripeFeeKZT) / (1 - STRIPE_PERCENT);

  return Math.ceil(finalPrice);
}

console.log('=== РАСЧЕТ ЦЕН НА ВИДЕО ===\n');

// Calculate for 8 seconds (standard video)
console.log('📹 Стандартное видео (8 секунд):');
console.log('-----------------------------------');

const models = ['sora-2', 'sora-2-pro'];
const sizes = {
  '720x1280': 'Вертикальное 720p',
  '1280x720': 'Горизонтальное 720p',
  '1024x1024': 'Квадратное 720p',
  '1024x1792': 'Вертикальное 1080p',
  '1792x1024': 'Горизонтальное 1080p',
};

models.forEach(model => {
  console.log(`\n${model.toUpperCase()}:`);
  Object.entries(sizes).forEach(([size, label]) => {
    if (SORA_COSTS_USD[model][size]) {
      const price = calculateSellingPrice(8, model, size);
      const cost = 8 * SORA_COSTS_USD[model][size] * USD_TO_KZT;
      const profit = price - cost;
      console.log(`  ${label} (${size}): ${price}₸ (затраты: ${Math.ceil(cost)}₸, прибыль: ${Math.ceil(profit)}₸)`);
    }
  });
});

// Calculate package prices
console.log('\n\n=== ПАКЕТЫ ТОКЕНОВ ===\n');

// Минимальный пакет - должен позволить купить 1 видео sora-2 8 сек
const minVideoPrice = calculateSellingPrice(8, 'sora-2', '1280x720');
console.log(`Цена 1 видео (8 сек, sora-2, 720p): ${minVideoPrice}₸\n`);

// Предлагаемые пакеты
const packages = [
  { tokens: minVideoPrice, discount: 0 },      // Минимум - 1 видео
  { tokens: minVideoPrice * 2, discount: 0.10 }, // 2 видео - скидка 10%
  { tokens: minVideoPrice * 5, discount: 0.15 }, // 5 видео - скидка 15%
  { tokens: minVideoPrice * 10, discount: 0.20 }, // 10 видео - скидка 20%
];

packages.forEach((pkg, idx) => {
  const basePrice = pkg.tokens;
  const discountedPrice = Math.ceil(basePrice * (1 - pkg.discount));
  const videos = Math.floor(pkg.tokens / minVideoPrice);

  console.log(`Пакет ${idx + 1}: ${pkg.tokens}₸ токенов`);
  console.log(`  Цена: ${discountedPrice}₸ (скидка ${pkg.discount * 100}%)`);
  console.log(`  Можно сгенерировать: ~${videos} видео (8 сек, sora-2, 720p)`);
  console.log('');
});

console.log('\n=== ТАБЛИЦА ЦЕН ДЛЯ ВСЕХ ДЛИТЕЛЬНОСТЕЙ ===\n');

const durations = [4, 6, 8, 10, 12];

console.log('SORA-2 (720p):');
durations.forEach(sec => {
  const price = calculateSellingPrice(sec, 'sora-2', '1280x720');
  console.log(`  ${sec} сек: ${price}₸`);
});

console.log('\nSORA-2-PRO (720p):');
durations.forEach(sec => {
  const price = calculateSellingPrice(sec, 'sora-2-pro', '1280x720');
  console.log(`  ${sec} сек: ${price}₸`);
});

console.log('\nSORA-2-PRO (1080p):');
durations.forEach(sec => {
  const price = calculateSellingPrice(sec, 'sora-2-pro', '1024x1792');
  console.log(`  ${sec} сек: ${price}₸`);
});
