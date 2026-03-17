import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq, and, gte, desc, inArray } from "drizzle-orm";
import { orders, orderItems, products, tableSessions } from "@/db/schema";
import { createOrderSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";
import { sseBroker } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const status = searchParams.get("status");

  const conditions = [eq(orders.restaurantId, session.user.restaurantId)];
  if (sessionId) conditions.push(eq(orders.sessionId, sessionId));
  if (status) conditions.push(eq(orders.status, status as any));

  const result = await db.query.orders.findMany({
    where: and(...conditions),
    with: {
      items: { with: { product: true } },
      session: { with: { table: true } },
      waiter: { columns: { name: true } },
    },
    orderBy: desc(orders.createdAt),
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "order:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Get daily sequential order number
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastOrder = await db.query.orders.findFirst({
    where: and(
      eq(orders.restaurantId, session.user.restaurantId),
      gte(orders.createdAt, today)
    ),
    orderBy: desc(orders.orderNumber),
  });
  const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

  // Fetch product prices
  const productIds = parsed.data.items.map((i) => i.productId);
  const prods = await db.query.products.findMany({
    where: and(
      inArray(products.id, productIds),
      eq(products.restaurantId, session.user.restaurantId)
    ),
  });
  const priceMap = new Map(prods.map((p) => [p.id, p.price]));

  // Create order
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      sessionId: parsed.data.sessionId,
      waiterId: session.user.id,
      restaurantId: session.user.restaurantId,
      status: "SENT",
      notes: parsed.data.notes,
    })
    .returning();

  // Create order items
  await db.insert(orderItems).values(
    parsed.data.items.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: priceMap.get(item.productId) ?? 0,
      notes: item.notes,
      status: "PENDING" as const,
    }))
  );

  // Update session status
  await db
    .update(tableSessions)
    .set({ status: "WAITING_FOOD" })
    .where(eq(tableSessions.id, parsed.data.sessionId));

  // Fetch full order with relations
  const full = await db.query.orders.findFirst({
    where: eq(orders.id, order.id),
    with: {
      items: { with: { product: true } },
      session: { with: { table: true } },
      waiter: { columns: { name: true } },
    },
  });

  // Broadcast to kitchen
  sseBroker.publish(`kitchen:${session.user.restaurantId}`, "order:new", {
    id: full!.id,
    orderNumber: full!.orderNumber,
    tableLabel: full!.session.table.label,
    waiterName: full!.waiter.name,
    items: full!.items.map((i) => ({
      id: i.id,
      productName: i.product.name,
      quantity: i.quantity,
      notes: i.notes,
      status: i.status,
    })),
    notes: full!.notes,
    createdAt: full!.createdAt,
  });

  // Broadcast floor update
  sseBroker.publish(`floor:${session.user.restaurantId}`, "session:update", {
    sessionId: parsed.data.sessionId,
    tableId: full!.session.table.id,
    status: "WAITING_FOOD",
  });

  return NextResponse.json(full, { status: 201 });
}
