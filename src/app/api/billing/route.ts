import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBillSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "billing:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createBillSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const subtotal = parsed.data.items.reduce(
    (acc, item) => acc + item.unitPrice * item.quantity,
    0
  );
  const tax = 0; // Configure tax rate in settings
  const total = subtotal + tax;

  const bill = await prisma.bill.create({
    data: {
      sessionId: parsed.data.sessionId,
      restaurantId: session.user.restaurantId,
      subtotal,
      tax,
      total,
      items: {
        create: parsed.data.items.map((item) => ({
          orderId: item.orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity,
        })),
      },
    },
    include: { items: true },
  });

  // Update session status
  await prisma.tableSession.update({
    where: { id: parsed.data.sessionId },
    data: { status: "WAITING_BILL" },
  });

  return NextResponse.json(bill, { status: 201 });
}
