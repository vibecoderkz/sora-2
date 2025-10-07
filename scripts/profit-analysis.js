const SORA_COSTS_USD = {
  'sora-2': {
    '720p': 0.10,
  },
  'sora-2-pro': {
    '720p': 0.30,
    '1080p': 0.50,
  }
};

const USD_TO_KZT = 480;
const PROFIT_MARGIN = 1.5;
const STRIPE_PERCENT = 0.029;
const STRIPE_FIXED_USD = 0.30;

function calculateProfit(seconds, model, resolution) {
  const costPerSecondUSD = SORA_COSTS_USD[model][resolution];
  const totalCostUSD = seconds * costPerSecondUSD;
  const totalCostKZT = totalCostUSD * USD_TO_KZT;

  // Selling price (with margin and Stripe fees)
  const priceWithProfit = totalCostKZT * PROFIT_MARGIN;
  const stripeFeeKZT = STRIPE_FIXED_USD * USD_TO_KZT;
  const finalPrice = (priceWithProfit + stripeFeeKZT) / (1 - STRIPE_PERCENT);

  // Calculate actual Stripe fee from final price
  const actualStripeFee = finalPrice * STRIPE_PERCENT + stripeFeeKZT;

  // Net profit
  const netProfit = finalPrice - totalCostKZT - actualStripeFee;
  const profitPercent = (netProfit / totalCostKZT) * 100;

  return {
    cost: Math.ceil(totalCostKZT),
    price: Math.ceil(finalPrice),
    stripeFee: Math.ceil(actualStripeFee),
    profit: Math.ceil(netProfit),
    profitPercent: profitPercent.toFixed(1)
  };
}

console.log('================================================================');
console.log('         ANALIZ PRIBYLI VIDEO (8 SEKUND)');
console.log('================================================================\n');

const models = [
  { name: 'Sora-2 (720p)', key: 'sora-2', res: '720p' },
  { name: 'Sora-2 Pro (720p)', key: 'sora-2-pro', res: '720p' },
  { name: 'Sora-2 Pro (1080p)', key: 'sora-2-pro', res: '1080p' }
];

models.forEach(model => {
  const result = calculateProfit(8, model.key, model.res);

  console.log(`${model.name}`);
  console.log(`   Vashi zatraty:    ${result.cost} tenge`);
  console.log(`   Tsena prodazhi:   ${result.price} tenge`);
  console.log(`   Komissiya Stripe: ${result.stripeFee} tenge`);
  console.log(`   ----------------------------`);
  console.log(`   Vasha pribyl:     ${result.profit} tenge (+${result.profitPercent}%)`);
  console.log('');
});

console.log('================================================================');
console.log('              VSE DLITELNOSTI');
console.log('================================================================\n');

[4, 6, 8, 10, 12].forEach(sec => {
  console.log(`${sec} SEKUND:`);
  console.log('');

  models.forEach(model => {
    const result = calculateProfit(sec, model.key, model.res);
    console.log(`  ${model.name}:`);
    console.log(`    Zatraty: ${result.cost} | Tsena: ${result.price} | Pribyl: ${result.profit} tenge`);
  });
  console.log('');
});

console.log('================================================================');
console.log('                   PAKETY TOKENOV');
console.log('================================================================\n');

const packages = [
  { tokens: 742, price: 742, videos: 1, discount: 0 },
  { tokens: 1484, price: 1336, videos: 2, discount: 10 },
  { tokens: 3710, price: 3154, videos: 5, discount: 15 },
  { tokens: 7420, price: 5936, videos: 10, discount: 20 }
];

packages.forEach((pkg, i) => {
  const stripeFee = Math.ceil(pkg.price * STRIPE_PERCENT + STRIPE_FIXED_USD * USD_TO_KZT);
  const netIncome = pkg.price - stripeFee;

  console.log(`Paket ${i+1}: ${pkg.tokens} tokenov (${pkg.videos} video)`);
  console.log(`  Tsena: ${pkg.price} tenge (skidka ${pkg.discount}%)`);
  console.log(`  Stripe zabiraet: ~${stripeFee} tenge`);
  console.log(`  Vam na schet: ~${netIncome} tenge`);
  console.log('');
});

console.log('================================================================');
console.log('                      PRIMER RASCHETA');
console.log('================================================================\n');

// Primer: polzovatel kupil paket na 10 video i sgeneriroval ikh
const packagePrice = 5936;
const stripeFeePackage = Math.ceil(packagePrice * STRIPE_PERCENT + STRIPE_FIXED_USD * USD_TO_KZT);
const youReceive = packagePrice - stripeFeePackage;

console.log('Stsenariy: Polzovatel kupil paket "Premium" (10 video)');
console.log('');
console.log(`1. Polzovatel platit: ${packagePrice} tenge`);
console.log(`2. Stripe zabiraet komissiyu: ${stripeFeePackage} tenge`);
console.log(`3. Vam prikhodit: ${youReceive} tenge`);
console.log('');
console.log('4. Polzovatel generiruet 10 video po 8 sek (Sora-2, 720p):');
const apiCostPerVideo = 8 * 0.10 * 480;
const totalApiCost = Math.ceil(apiCostPerVideo * 10);
console.log(`   Vashi zatraty na API: ${totalApiCost} tenge`);
console.log('');
console.log(`CHISTAYA PRIBYL: ${youReceive - totalApiCost} tenge`);
console.log(`Marzha: ${(((youReceive - totalApiCost) / totalApiCost) * 100).toFixed(1)}%`);

console.log('\n================================================================');
console.log('           PRIMER PO KAZHDOMU TIPU VIDEO (8 sek)');
console.log('================================================================\n');

models.forEach(model => {
  const result = calculateProfit(8, model.key, model.res);
  console.log(`${model.name}:`);
  console.log(`  Klient platit: ${result.price} tenge`);
  console.log(`  Stripe: -${result.stripeFee} tenge`);
  console.log(`  API Sora: -${result.cost} tenge`);
  console.log(`  = Vasha chistaya pribyl: ${result.profit} tenge (${result.profitPercent}% marzhi)`);
  console.log('');
});
