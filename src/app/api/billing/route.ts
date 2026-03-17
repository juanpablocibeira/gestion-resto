import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { bills, billItems, tableSessions } from "@/db/schema";
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

  // Create bill
  const [bill] = await db
    .insert(bills)
    .values({
      sessionId: parsed.data.sessionId,
      restaurantId: session.user.restaurantId,
      subtotal,
      tax,
      total,
    })
    .returning();

  // Create bill items
  await db.insert(billItems).values(
    parsed.data.items.map((item) => ({
      billId: bill.id,
      orderId: item.orderId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.unitPrice * item.quantity,
    }))
  );

  // Update session status
  await db
    .update(tableSessions)
    .set({ status: "WAITING_BILL" })
    .where(eq(tableSessions.id, parsed.data.sessionId));

  const full = await db.query.bills.findFirst({
    where: eq(bills.id, bill.id),
    with: { items: true },
  });

  return NextResponse.json(full, { status: 201 });
}
