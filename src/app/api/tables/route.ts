import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq, and, ne } from "drizzle-orm";
import { restaurantTables, tableSessions } from "@/db/schema";
import { tableSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const floorPlanId = searchParams.get("floorPlanId");

  const where = floorPlanId
    ? and(eq(restaurantTables.restaurantId, session.user.restaurantId), eq(restaurantTables.floorPlanId, floorPlanId))
    : eq(restaurantTables.restaurantId, session.user.restaurantId);

  const tables = await db.query.restaurantTables.findMany({
    where,
    with: {
      sessions: {
        where: ne(tableSessions.status, "CLOSED"),
        with: { waiter: { columns: { name: true } } },
        limit: 1,
      },
    },
  });
  return NextResponse.json(tables);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "floor:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = tableSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [table] = await db
    .insert(restaurantTables)
    .values({ ...parsed.data, restaurantId: session.user.restaurantId })
    .returning();
  return NextResponse.json(table, { status: 201 });
}
