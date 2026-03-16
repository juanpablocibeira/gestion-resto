import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { floorPlanSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { planId } = await params;

  const plan = await prisma.floorPlan.findFirst({
    where: { id: planId, restaurantId: session.user.restaurantId },
    include: { tables: true },
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

  await prisma.floorPlan.updateMany({
    where: { id: planId, restaurantId: session.user.restaurantId },
    data: parsed.data,
  });
  const updated = await prisma.floorPlan.findUnique({ where: { id: planId }, include: { tables: true } });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "floor:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { planId } = await params;

  await prisma.floorPlan.deleteMany({
    where: { id: planId, restaurantId: session.user.restaurantId },
  });
  return NextResponse.json({ ok: true });
}
