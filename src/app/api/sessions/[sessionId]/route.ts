import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { tableSessions } from "@/db/schema";
import { sseBroker } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { sessionId } = await params;

  const tableSession = await db.query.tableSessions.findFirst({
    where: and(eq(tableSessions.id, sessionId), eq(tableSessions.restaurantId, session.user.restaurantId)),
    with: {
      table: true,
      waiter: { columns: { name: true } },
      orders: {
        with: { items: { with: { product: true } } },
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      },
      bills: { with: { items: true } },
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

  const result = await db
    .update(tableSessions)
    .set(updateData)
    .where(and(eq(tableSessions.id, sessionId), eq(tableSessions.restaurantId, session.user.restaurantId)))
    .returning();

  const updated = await db.query.tableSessions.findFirst({
    where: eq(tableSessions.id, sessionId),
    with: { table: true },
  });

  sseBroker.publish(`floor:${session.user.restaurantId}`, "session:update", {
    sessionId,
    tableId: updated?.tableId,
    status,
  });

  return NextResponse.json(updated);
}
