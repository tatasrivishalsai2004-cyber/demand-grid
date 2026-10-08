import { z } from "zod";
import { db } from "@/lib/db";
import { requireStore } from "@/lib/auth";
const Body = z.object({ customer: z.string().max(80).optional(), items: z.array(z.object({ productId: z.string(), qty: z.number().int().positive().max(1000) })).min(1).max(100) });

// POST /api/sales -> receipt + FEFO stock deduction + events, all in one transaction.
export async function POST(req: Request) {
  const { storeId, userId } = requireStore(req);
  const body = Body.safeParse(await req.json());
  if (!body.success) return Response.json(body.error.flatten(), { status: 400 });
  try {
    const sale = await db.$transaction(async (tx) => {
      const lines: { productId: string; batchNo: string; qty: number; price: number; gstPct: number }[] = [];
      for (const it of body.data.items) {
        const p = await tx.product.findFirst({ where: { id: it.productId, storeId } }); // tenant filter
        if (!p) throw new Error("Product not found");
        let left = it.qty;
        const batches = await tx.inventory.findMany({ where: { storeId, productId: p.id, qty: { gt: 0 }, expiry: { gt: new Date() } }, orderBy: { expiry: "asc" } });
        for (const b of batches) {
          if (!left) break;
          const take = Math.min(b.qty, left); left -= take;
          await tx.inventory.update({ where: { id: b.id }, data: { qty: { decrement: take } } });
          await tx.inventoryEvent.create({ data: { storeId, inventoryId: b.id, delta: -take, reason: "SALE" } });
          lines.push({ productId: p.id, batchNo: b.batchNo, qty: take, price: Number(p.mrp), gstPct: p.gstPct });
        }
        if (left) throw new Error(`Insufficient stock for ${p.name}`);
      }
      const total = lines.reduce((t, l) => t + l.qty * l.price, 0); // MRP is GST-inclusive
      const subtotal = lines.reduce((t, l) => t + (l.qty * l.price) / (1 + l.gstPct / 100), 0);
      const count = await tx.sale.count({ where: { storeId } });
      return tx.sale.create({ data: { storeId, receiptNo: `RC-${String(count + 1).padStart(6, "0")}`, customer: body.data.customer,
        subtotal: subtotal.toFixed(2), gst: (total - subtotal).toFixed(2), total: total.toFixed(2), items: { create: lines } }, include: { items: true } });
    });
    await db.auditLog.create({ data: { storeId, userId, action: "SALE_CREATED", meta: { receipt: sale.receiptNo } } });
    return Response.json(sale, { status: 201 });
  } catch (e) { return Response.json({ error: (e as Error).message }, { status: 409 }); }
}
