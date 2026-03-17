import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq, and, asc } from "drizzle-orm";
import { products } from "@/db/schema";
import { productSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  const where = categoryId
    ? and(eq(products.restaurantId, session.user.restaurantId), eq(products.categoryId, categoryId))
    : eq(products.restaurantId, session.user.restaurantId);

  const result = await db.query.products.findMany({
    where,
    with: { category: true },
    orderBy: asc(products.name),
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "product:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [product] = await db
    .insert(products)
    .values({ ...parsed.data, restaurantId: session.user.restaurantId })
    .returning();

  const full = await db.query.products.findFirst({
    where: eq(products.id, product.id),
    with: { category: true },
  });
  return NextResponse.json(full, { status: 201 });
}
