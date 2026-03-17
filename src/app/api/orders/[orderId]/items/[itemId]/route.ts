import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { orderItems, orders } from "@/db/schema";
import { updateOrderItemStatusSchema } from "@/lib/validators";
import { sseBroker } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orderId, itemId } = await params;

  const body = await req.json();
  const parsed = updateOrderItemStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Update the item
  await db
    .update(orderItems)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(orderItems.id, itemId));

  // Check if all items in the order are ready
  const allItems = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
  });

  const allReady = allItems.every(
    (item) => item.status === "READY" || item.status === "DELIVERED" || item.status === "CANCELLED"
  );

  if (allReady) {
    await db
      .update(orders)
      .set({ status: "READY", updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { session: { with: { table: true } } },
    });

    if (order) {
      sseBroker.publish(`kitchen:${session.user.restaurantId}`, "order:ready", {
        id: orderId,
        orderNumber: order.orderNumber,
        tableLabel: order.session.table.label,
      });
      sseBroker.publish(`floor:${session.user.restaurantId}`, "order:ready", {
        orderId,
        tableId: order.session.tableId,
        tableLabel: order.session.table.label,
        orderNumber: order.orderNumber,
      });
    }
  }

  // Broadcast item update to kitchen
  const updatedItem = await db.query.orderItems.findFirst({
    where: eq(orderItems.id, itemId),
    with: { product: true },
  });

  sseBroker.publish(`kitchen:${session.user.restaurantId}`, "item:update", {
    orderId,
    itemId,
    status: parsed.data.status,
    productName: updatedItem?.product.name,
  });

  return NextResponse.json(updatedItem);
}
