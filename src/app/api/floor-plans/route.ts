import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { floorPlans } from "@/db/schema";
import { floorPlanSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await db.query.floorPlans.findMany({
    where: eq(floorPlans.restaurantId, session.user.restaurantId),
    with: { tables: true },
  });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "floor:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = floorPlanSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [plan] = await db
    .insert(floorPlans)
    .values({ ...parsed.data, restaurantId: session.user.restaurantId })
    .returning();

  const full = await db.query.floorPlans.findFirst({
    where: eq(floorPlans.id, plan.id),
    with: { tables: true },
  });
  return NextResponse.json(full, { status: 201 });
}
