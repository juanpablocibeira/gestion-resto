import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { floorPlans } from "@/db/schema";
import { floorPlanSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { planId } = await params;

  const plan = await db.query.floorPlans.findFirst({
    where: and(eq(floorPlans.id, planId), eq(floorPlans.restaurantId, session.user.restaurantId)),
    with: { tables: true },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "floor:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { planId } = await params;

  const body = await req.json();
  const parsed = floorPlanSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = await db
    .update(floorPlans)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(floorPlans.id, planId), eq(floorPlans.restaurantId, session.user.restaurantId)))
    .returning();
  if (result.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.query.floorPlans.findFirst({
    where: eq(floorPlans.id, planId),
    with: { tables: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "floor:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { planId } = await params;

  await db
    .delete(floorPlans)
    .where(and(eq(floorPlans.id, planId), eq(floorPlans.restaurantId, session.user.restaurantId)));
  return NextResponse.json({ ok: true });
}
