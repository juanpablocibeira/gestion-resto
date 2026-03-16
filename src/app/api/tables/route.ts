import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tableSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const floorPlanId = searchParams.get("floorPlanId");

  const tables = await prisma.restaurantTable.findMany({
    where: {
      restaurantId: session.user.restaurantId,
      ...(floorPlanId ? { floorPlanId } : {}),
    },
    include: {
      sessions: {
        where: { status: { not: "CLOSED" } },
        include: { waiter: { select: { name: true } } },
        take: 1,
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

  const table = await prisma.restaurantTable.create({
    data: { ...parsed.data, restaurantId: session.user.restaurantId },
  });
  return NextResponse.json(table, { status: 201 });
}
