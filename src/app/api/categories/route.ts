import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq, asc, count } from "drizzle-orm";
import { categories, products } from "@/db/schema";
import { categorySchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await db.query.categories.findMany({
    where: eq(categories.restaurantId, session.user.restaurantId),
    orderBy: asc(categories.sortOrder),
    with: { products: true },
  });

  const mapped = result.map((c) => ({
    ...c,
    _count: { products: c.products.length },
    products: undefined,
  }));

  return NextResponse.json(mapped);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "product:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [category] = await db
    .insert(categories)
    .values({ ...parsed.data, restaurantId: session.user.restaurantId })
    .returning();
  return NextResponse.json(category, { status: 201 });
}
