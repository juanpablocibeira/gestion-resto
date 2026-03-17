import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { bills, tableSessions } from "@/db/schema";
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

  const [updatedBill] = await db
    .update(bills)
    .set({
      paid: true,
      paymentMethod: parsed.data.paymentMethod,
      updatedAt: new Date(),
    })
    .where(eq(bills.id, billId))
    .returning();

  const bill = await db.query.bills.findFirst({
    where: eq(bills.id, billId),
    with: {
      session: {
        with: { table: true, bills: true },
      },
    },
  });

  // Check if all bills for this session are paid
  const allPaid = bill!.session.bills.every((b) => b.id === billId ? true : b.paid);
  if (allPaid) {
    await db
      .update(tableSessions)
      .set({ status: "CLOSED", closedAt: new Date() })
      .where(eq(tableSessions.id, bill!.sessionId));

    sseBroker.publish(`floor:${session.user.restaurantId}`, "session:update", {
      sessionId: bill!.sessionId,
      tableId: bill!.session.table.id,
      status: "CLOSED",
    });
  }

  return NextResponse.json(bill);
}
