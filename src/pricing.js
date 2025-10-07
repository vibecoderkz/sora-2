// Pricing logic for Sora video generation in KZT (Tenge)
// 1 токен = 1₸ (тенге)
// Based on real Sora API pricing with 50% profit margin and Stripe fees

// Real Sora API costs: $0.10/sec (sora-2 720p), $0.30/sec (sora-2-pro 720p), $0.50/sec (sora-2-pro 1080p)
// Exchange rate: 1 USD = 480 KZT
// Formula: (API_cost_USD * 480 * 1.5 + Stripe_fixed) / (1 - 0.029)

const PRICING_TABLE = {
  'sora-2': {
    // All resolutions same price (720p tier) - $0.10/sec
    '720x1280': { 4: 445, 6: 594, 8: 742, 10: 890, 12: 1039 },
    '1280x720': { 4: 445, 6: 594, 8: 742, 10: 890, 12: 1039 },
    '1024x1024': { 4: 445, 6: 594, 8: 742, 10: 890, 12: 1039 },
  },
  'sora-2-pro': {
    // 720p tier - $0.30/sec
    '720x1280': { 4: 1039, 6: 1484, 8: 1928, 10: 2373, 12: 2818 },
    '1280x720': { 4: 1039, 6: 1484, 8: 1928, 10: 2373, 12: 2818 },
    '1024x1024': { 4: 1039, 6: 1484, 8: 1928, 10: 2373, 12: 2818 },
    // 1080p tier - $0.50/sec
    '1024x1792': { 4: 1632, 6: 2373, 8: 3115, 10: 3856, 12: 4598 },
    '1792x1024': { 4: 1632, 6: 2373, 8: 3115, 10: 3856, 12: 4598 },
  }
};

export function calculateCredits(seconds, model, size = '1280x720') {
  const modelKey = model.includes('pro') ? 'sora-2-pro' : 'sora-2';

  // Use pricing table for defined durations and sizes
  if (PRICING_TABLE[modelKey][size] && PRICING_TABLE[modelKey][size][seconds]) {
    return PRICING_TABLE[modelKey][size][seconds];
  }

  // Fallback: use default 720p pricing
  const defaultSize = modelKey === 'sora-2-pro' ? '720x1280' : '1280x720';
  if (PRICING_TABLE[modelKey][defaultSize] && PRICING_TABLE[modelKey][defaultSize][seconds]) {
    return PRICING_TABLE[modelKey][defaultSize][seconds];
  }

  // Ultimate fallback: interpolate from 8s baseline
  const baseCost = modelKey === 'sora-2-pro' ? 1928 : 742; // 8s baseline
  const extraSeconds = seconds - 8;
  const costPerSecond = modelKey === 'sora-2-pro' ? 148 : 148;

  return Math.ceil(baseCost + (extraSeconds * costPerSecond));
}

export function getVideoCost(seconds, model, size = '1280x720') {
  const cost = calculateCredits(parseInt(seconds), model, size);
  return {
    credits: cost,
    formatted: cost.toString()
  };
}

// Get display label for credit cost
export function getCostLabel(seconds, model, size = '1280x720') {
  const cost = getVideoCost(seconds, model, size);
  return `${cost.formatted}₸`;
}

// Validate if user has enough credits
export function canAfford(userCredits, seconds, model, size = '1280x720') {
  const cost = getVideoCost(seconds, model, size);
  return userCredits >= cost.credits;
}
