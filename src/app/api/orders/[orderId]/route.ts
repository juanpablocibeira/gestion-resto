import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { orders } from "@/db/schema";
import { sseBroker } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orderId } = await params;

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.restaurantId, session.user.restaurantId)),
    with: {
      items: { with: { product: true } },
      session: { with: { table: true } },
      waiter: { columns: { name: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orderId } = await params;

  const body = await req.json();
  const { status } = body;

  await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.restaurantId, session.user.restaurantId)));

  const updated = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      items: { with: { product: true } },
      session: { with: { table: true } },
      waiter: { columns: { name: true } },
    },
  });

  if (updated) {
    sseBroker.publish(`kitchen:${session.user.restaurantId}`, `order:${status.toLowerCase()}`, {
      id: updated.id,
      orderNumber: updated.orderNumber,
      tableLabel: updated.session.table.label,
      status,
    });

    if (status === "READY") {
      sseBroker.publish(`floor:${session.user.restaurantId}`, "order:ready", {
        orderId: updated.id,
        tableId: updated.session.table.id,
        tableLabel: updated.session.table.label,
        orderNumber: updated.orderNumber,
      });
    }

    if (status === "DELIVERED") {
      sseBroker.publish(`floor:${session.user.restaurantId}`, "order:delivered", {
        orderId: updated.id,
        tableId: updated.session.table.id,
      });
    }
  }

  return NextResponse.json(updated);
}
