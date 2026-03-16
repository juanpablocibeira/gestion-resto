import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sseBroker } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sessionId } = await params;

  const tableSession = await prisma.tableSession.findFirst({
    where: { id: sessionId, restaurantId: session.user.restaurantId },
    include: {
      table: true,
      waiter: { select: { name: true } },
      orders: {
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
      },
      bills: { include: { items: true } },
    },
  });
  if (!tableSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tableSession);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sessionId } = await params;

  const body = await req.json();
  const { status } = body;

  const updateData: Record<string, unknown> = { status };
  if (status === "CLOSED") {
    updateData.closedAt = new Date();
  }

  await prisma.tableSession.updateMany({
    where: { id: sessionId, restaurantId: session.user.restaurantId },
    data: updateData,
  });

  const updated = await prisma.tableSession.findUnique({
    where: { id: sessionId },
    include: { table: true },
  });

  sseBroker.publish(`floor:${session.user.restaurantId}`, "session:update", {
    sessionId,
    tableId: updated?.tableId,
    status,
  });

  return NextResponse.json(updated);
}
