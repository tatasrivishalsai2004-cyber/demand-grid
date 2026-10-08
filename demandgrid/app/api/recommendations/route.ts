import { db } from "@/lib/db";
import { requireStore } from "@/lib/auth";
import { wmaTrend, recommend } from "@/lib/forecast";

// GET /api/recommendations -> reorder suggestions with explanation, most urgent first.
export async function GET(req: Request) {
  const { storeId } = requireStore(req);
  const since = new Date(Date.now() - 28 * 864e5);
  const products = await db.product.findMany({ where: { storeId }, include: { batches: { where: { expiry: { gt: new Date() } } } } });
  const items = await db.saleItem.findMany({ where: { sale: { storeId, createdAt: { gte: since } } }, select: { productId: true, qty: true, sale: { select: { createdAt: true } } } });
  const byProduct = new Map<string, number[]>();
  for (const it of items) {
    const day = 27 - Math.floor((Date.now() - it.sale.createdAt.getTime()) / 864e5);
    const arr = byProduct.get(it.productId) ?? Array(28).fill(0);
    if (day >= 0) arr[day] += it.qty;
    byProduct.set(it.productId, arr);
  }
  const out = products.map((p) => {
    const f = wmaTrend(byProduct.get(p.id) ?? []);
    const r = recommend({ stock: p.batches.reduce((t, b) => t + b.qty, 0), daily: f.daily, leadDays: p.leadDays, safety: p.safetyStock });
    return { productId: p.id, name: p.name, confidence: f.confidence, ...r };
  }).filter((r) => r.qty > 0).sort((a, b) => a.daysLeft - b.daysLeft);
  return Response.json(out);
}
