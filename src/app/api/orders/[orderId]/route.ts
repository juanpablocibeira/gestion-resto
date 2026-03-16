import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sseBroker } from "@/lib/sse";

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orderId } = await params;

  const order = await prisma.order.findFirst({
    where: { id: orderId, restaurantId: session.user.restaurantId },
    include: {
      items: { include: { product: true } },
      session: { include: { table: true } },
      waiter: { select: { name: true } },
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

  await prisma.order.updateMany({
    where: { id: orderId, restaurantId: session.user.restaurantId },
    data: { status },
  });

  const updated = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      session: { include: { table: true } },
      waiter: { select: { name: true } },
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
