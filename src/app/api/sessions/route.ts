import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openSessionSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";
import { sseBroker } from "@/lib/sse";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "table:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = openSessionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Check if table already has an open session
  const existing = await prisma.tableSession.findFirst({
    where: { tableId: parsed.data.tableId, status: { not: "CLOSED" } },
  });
  if (existing) {
    return NextResponse.json({ error: "Table already has an open session" }, { status: 409 });
  }

  const tableSession = await prisma.tableSession.create({
    data: {
      tableId: parsed.data.tableId,
      waiterId: session.user.id,
      restaurantId: session.user.restaurantId,
      guests: parsed.data.guests,
    },
    include: { table: true, waiter: { select: { name: true } } },
  });

  sseBroker.publish(`floor:${session.user.restaurantId}`, "session:open", {
    tableId: parsed.data.tableId,
    sessionId: tableSession.id,
    waiterName: tableSession.waiter.name,
    guests: parsed.data.guests,
  });

  return NextResponse.json(tableSession, { status: 201 });
}
