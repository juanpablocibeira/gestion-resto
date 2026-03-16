import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "user:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { userId } = await params;

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  if (body.name) updateData.name = body.name;
  if (body.email) updateData.email = body.email;
  if (body.role) updateData.role = body.role;
  if (body.pin !== undefined) updateData.pin = body.pin;
  if (body.active !== undefined) updateData.active = body.active;
  if (body.password) {
    updateData.passwordHash = await bcrypt.hash(body.password, 10);
  }

  await prisma.user.updateMany({
    where: { id: userId, restaurantId: session.user.restaurantId },
    data: updateData,
  });

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, pin: true, active: true, createdAt: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "user:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { userId } = await params;

  // Soft delete: deactivate instead of deleting
  await prisma.user.updateMany({
    where: { id: userId, restaurantId: session.user.restaurantId },
    data: { active: false },
  });
  return NextResponse.json({ ok: true });
}
