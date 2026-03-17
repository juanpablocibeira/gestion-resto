import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { products } from "@/db/schema";
import { productSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { productId } = await params;

  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.restaurantId, session.user.restaurantId)),
    with: { category: true },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "product:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { productId } = await params;

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = await db
    .update(products)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.restaurantId, session.user.restaurantId)))
    .returning();
  if (result.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.query.products.findFirst({
    where: eq(products.id, productId),
    with: { category: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "product:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { productId } = await params;

  await db
    .delete(products)
    .where(and(eq(products.id, productId), eq(products.restaurantId, session.user.restaurantId)));
  return NextResponse.json({ ok: true });
}
