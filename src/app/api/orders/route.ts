import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const orders = await prisma.order.findMany({
    where: {
      restaurantId: session.user.restaurantId,
      ...(sessionId ? { sessionId } : {}),
      ...(status ? { status: status as any } : {}),
    },
    include: {
      items: { include: { product: true } },
      session: { include: { table: true } },
      waiter: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
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
  const lastOrder = await prisma.order.findFirst({
    where: {
      restaurantId: session.user.restaurantId,
      createdAt: { gte: today },
    },
    orderBy: { orderNumber: "desc" },
  });
  const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

  // Fetch product prices
  const productIds = parsed.data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, restaurantId: session.user.restaurantId },
  });
  const priceMap = new Map(products.map((p) => [p.id, p.price]));

  const order = await prisma.order.create({
    data: {
      orderNumber,
      sessionId: parsed.data.sessionId,
      waiterId: session.user.id,
      restaurantId: session.user.restaurantId,
      status: "SENT",
      notes: parsed.data.notes,
      items: {
        create: parsed.data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: priceMap.get(item.productId) ?? 0,
          notes: item.notes,
          status: "PENDING",
        })),
      },
    },
    include: {
      items: { include: { product: true } },
      session: { include: { table: true } },
      waiter: { select: { name: true } },
    },
  });

  // Update session status
  await prisma.tableSession.update({
    where: { id: parsed.data.sessionId },
    data: { status: "WAITING_FOOD" },
  });

  // Broadcast to kitchen
  sseBroker.publish(`kitchen:${session.user.restaurantId}`, "order:new", {
    id: order.id,
    orderNumber: order.orderNumber,
    tableLabel: order.session.table.label,
    waiterName: order.waiter.name,
    items: order.items.map((i) => ({
      id: i.id,
      productName: i.product.name,
      quantity: i.quantity,
      notes: i.notes,
      status: i.status,
    })),
    notes: order.notes,
    createdAt: order.createdAt,
  });

  // Broadcast floor update
  sseBroker.publish(`floor:${session.user.restaurantId}`, "session:update", {
    sessionId: parsed.data.sessionId,
    tableId: order.session.table.id,
    status: "WAITING_FOOD",
  });

  return NextResponse.json(order, { status: 201 });
}
