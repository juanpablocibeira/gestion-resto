import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { categories } from "@/db/schema";
import { categorySchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { categoryId } = await params;

  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.restaurantId, session.user.restaurantId)),
    with: { products: true },
  });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(category);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "product:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { categoryId } = await params;

  const body = await req.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = await db
    .update(categories)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(categories.id, categoryId), eq(categories.restaurantId, session.user.restaurantId)))
    .returning();
  if (result.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "product:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { categoryId } = await params;

  await db
    .delete(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.restaurantId, session.user.restaurantId)));
  return NextResponse.json({ ok: true });
}
