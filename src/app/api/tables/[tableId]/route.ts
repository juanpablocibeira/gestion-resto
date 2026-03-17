import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq, and, ne } from "drizzle-orm";
import { restaurantTables, tableSessions } from "@/db/schema";
import { tableSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ tableId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tableId } = await params;

  const table = await db.query.restaurantTables.findFirst({
    where: and(eq(restaurantTables.id, tableId), eq(restaurantTables.restaurantId, session.user.restaurantId)),
    with: {
      sessions: {
        where: ne(tableSessions.status, "CLOSED"),
        with: {
          waiter: { columns: { name: true } },
          orders: { with: { items: { with: { product: true } } } },
        },
        limit: 1,
      },
    },
  });
  if (!table) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(table);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ tableId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "floor:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { tableId } = await params;

  const body = await req.json();
  const parsed = tableSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = await db
    .update(restaurantTables)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(restaurantTables.id, tableId), eq(restaurantTables.restaurantId, session.user.restaurantId)))
    .returning();
  if (result.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ tableId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "floor:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { tableId } = await params;

  await db
    .delete(restaurantTables)
    .where(and(eq(restaurantTables.id, tableId), eq(restaurantTables.restaurantId, session.user.restaurantId)));
  return NextResponse.json({ ok: true });
}
