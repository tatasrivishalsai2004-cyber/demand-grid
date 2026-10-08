// Modular forecasting: swap `wmaTrend` for Croston / LightGBM later without touching callers.
export type Forecaster = (dailySales: number[]) => { daily: number; confidence: number };
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
// dailySales: oldest -> newest, units per day (up to last 28 days)
export const wmaTrend: Forecaster = (s) => {
  if (!s.length) return { daily: 0, confidence: 0 };
  let num = 0, den = 0;
  s.forEach((v, i) => { num += v * (i + 1); den += i + 1; }); // recent days weigh more
  const wma = num / den;
  const last7 = avg(s.slice(-7)), prev7 = avg(s.slice(-14, -7));
  const trend = prev7 > 0 ? Math.min(1.3, Math.max(0.7, last7 / prev7)) : 1;
  const mean = avg(s), sd = Math.sqrt(avg(s.map((v) => (v - mean) ** 2)));
  const cv = mean > 0 ? sd / mean : 1;
  return { daily: +(wma * (1 + (trend - 1) / 2)).toFixed(2), confidence: +Math.max(0.3, Math.min(0.97, 1 - cv / 2)).toFixed(2) };
};
export function recommend(p: { stock: number; onOrder?: number; daily: number; leadDays: number; safety: number; coverDays?: number }) {
  const cover = p.coverDays ?? 14;
  const position = p.stock + (p.onOrder ?? 0);
  const daysLeft = p.daily > 0 ? p.stock / p.daily : Infinity;
  const reorderPoint = p.daily * p.leadDays + p.safety;
  const expected = p.daily * (p.leadDays + cover);
  const target = Math.round(expected + p.safety);
  const qty = position <= reorderPoint + p.daily * cover ? Math.max(0, target - position) : 0;
  return { daysLeft, reorderPoint, expectedDemand: Math.round(expected), target, qty,
    explanation: { stock: p.stock, onOrder: p.onOrder ?? 0, dailyDemand: p.daily, leadDays: p.leadDays, safety: p.safety, expectedDemand: Math.round(expected), target, qty } };
}
