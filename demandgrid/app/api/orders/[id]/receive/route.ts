import { z } from "zod";
import { db } from "@/lib/db";
import { requireStore } from "@/lib/auth";
const Body = z.object({ items: z.array(z.object({ itemId: z.string(), receivedQty: z.number().int().min(0), batchNo: z.string().min(1), expiry: z.coerce.date() })).min(1) });

// POST /api/orders/:id/receive -> retailer confirms counted quantities after supplier marks DELIVERED.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { storeId } = requireStore(req);
  const body = Body.safeParse(await req.json());
  if (!body.success) return Response.json(body.error.flatten(), { status: 400 });
  try {
    const result = await db.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findFirst({ where: { id: params.id, storeId, status: "DELIVERED" }, include: { items: true } });
      if (!order) throw new Error("Order not found or not awaiting receipt");
      let short = false;
      for (const line of body.data.items) {
        const item = order.items.find((i) => i.id === line.itemId);
        if (!item) throw new Error("Item not in order");
        if (line.receivedQty < item.qty) short = true;
        await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { receivedQty: line.receivedQty } });
        if (line.receivedQty > 0) {
          const inv = await tx.inventory.create({ data: { storeId, productId: item.productId, batchNo: line.batchNo, expiry: line.expiry, qty: line.receivedQty } });
          await tx.inventoryEvent.create({ data: { storeId, inventoryId: inv.id, delta: line.receivedQty, reason: "PURCHASE", ref: order.id } });
        }
      }
      return tx.purchaseOrder.update({ where: { id: order.id }, data: { status: short ? "PARTIAL" : "RECEIVED" } });
    });
    return Response.json(result);
  } catch (e) { return Response.json({ error: (e as Error).message }, { status: 409 }); }
}
