import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tableSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ tableId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tableId } = await params;

  const table = await prisma.restaurantTable.findFirst({
    where: { id: tableId, restaurantId: session.user.restaurantId },
    include: {
      sessions: {
        where: { status: { not: "CLOSED" } },
        include: {
          waiter: { select: { name: true } },
          orders: { include: { items: { include: { product: true } } } },
        },
        take: 1,
      },
    },
  });
  if (!table) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(table);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ tableId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "floor:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { tableId } = await params;

  const body = await req.json();
  const parsed = tableSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.restaurantTable.updateMany({
    where: { id: tableId, restaurantId: session.user.restaurantId },
    data: parsed.data,
  });
  const updated = await prisma.restaurantTable.findUnique({ where: { id: tableId } });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ tableId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "floor:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { tableId } = await params;

  await prisma.restaurantTable.deleteMany({
    where: { id: tableId, restaurantId: session.user.restaurantId },
  });
  return NextResponse.json({ ok: true });
}
