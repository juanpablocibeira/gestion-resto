import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { users } from "@/db/schema";
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
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name) updateData.name = body.name;
  if (body.email) updateData.email = body.email;
  if (body.role) updateData.role = body.role;
  if (body.pin !== undefined) updateData.pin = body.pin;
  if (body.active !== undefined) updateData.active = body.active;
  if (body.password) {
    updateData.passwordHash = await bcrypt.hash(body.password, 10);
  }

  const result = await db
    .update(users)
    .set(updateData)
    .where(and(eq(users.id, userId), eq(users.restaurantId, session.user.restaurantId)))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      pin: users.pin,
      active: users.active,
      createdAt: users.createdAt,
    });
  if (result.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "user:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { userId } = await params;

  // Soft delete: deactivate instead of deleting
  await db
    .update(users)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.restaurantId, session.user.restaurantId)));
  return NextResponse.json({ ok: true });
}
