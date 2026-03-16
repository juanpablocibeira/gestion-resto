import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { payBillSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";
import { sseBroker } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ billId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "billing:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { billId } = await params;

  const body = await req.json();
  const parsed = payBillSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const bill = await prisma.bill.update({
    where: { id: billId },
    data: {
      paid: true,
      paymentMethod: parsed.data.paymentMethod,
    },
    include: { session: { include: { table: true, bills: true } } },
  });

  // Check if all bills for this session are paid
  const allPaid = bill.session.bills.every((b) => b.id === billId ? true : b.paid);
  if (allPaid) {
    await prisma.tableSession.update({
      where: { id: bill.sessionId },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    sseBroker.publish(`floor:${session.user.restaurantId}`, "session:update", {
      sessionId: bill.sessionId,
      tableId: bill.session.table.id,
      status: "CLOSED",
    });
  }

  return NextResponse.json(bill);
}
