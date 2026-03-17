import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq, and, ne } from "drizzle-orm";
import { tableSessions } from "@/db/schema";
import { openSessionSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";
import { sseBroker } from "@/lib/sse";

export const dynamic = "force-dynamic";

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
  const existing = await db.query.tableSessions.findFirst({
    where: and(
      eq(tableSessions.tableId, parsed.data.tableId),
      ne(tableSessions.status, "CLOSED")
    ),
  });
  if (existing) {
    return NextResponse.json({ error: "Table already has an open session" }, { status: 409 });
  }

  const [tableSession] = await db
    .insert(tableSessions)
    .values({
      tableId: parsed.data.tableId,
      waiterId: session.user.id,
      restaurantId: session.user.restaurantId,
      guests: parsed.data.guests,
    })
    .returning();

  const full = await db.query.tableSessions.findFirst({
    where: eq(tableSessions.id, tableSession.id),
    with: { table: true, waiter: { columns: { name: true } } },
  });

  sseBroker.publish(`floor:${session.user.restaurantId}`, "session:open", {
    tableId: parsed.data.tableId,
    sessionId: tableSession.id,
    waiterName: full!.waiter.name,
    guests: parsed.data.guests,
  });

  return NextResponse.json(full, { status: 201 });
}
