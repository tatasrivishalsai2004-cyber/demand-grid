import { z } from "zod";
import { db } from "@/lib/db";
import { requireStore } from "@/lib/auth";
const Body = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(500).optional() });

// POST /api/orders/:id/review -> one review per received order, by the ordering store only.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { storeId } = requireStore(req);
  const body = Body.safeParse(await req.json());
  if (!body.success) return Response.json(body.error.flatten(), { status: 400 });
  const order = await db.purchaseOrder.findFirst({ where: { id: params.id, storeId, status: { in: ["RECEIVED", "PARTIAL"] } } });
  if (!order) return Response.json({ error: "Order not received yet" }, { status: 409 });
  try {
    const review = await db.supplierReview.create({ data: { storeId, supplierId: order.supplierId, orderId: order.id, ...body.data } });
    return Response.json(review, { status: 201 });
  } catch { return Response.json({ error: "Already reviewed" }, { status: 409 }); }
}
