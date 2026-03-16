"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CreditCard, Banknote, Smartphone, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface SessionDetail {
  id: string;
  status: string;
  guests: number;
  table: { id: string; label: string };
  waiter: { name: string };
  orders: {
    id: string;
    orderNumber: number;
    status: string;
    items: {
      id: string;
      quantity: number;
      unitPrice: number;
      status: string;
      product: { id: string; name: string };
    }[];
  }[];
  bills: {
    id: string;
    subtotal: number;
    tax: number;
    total: number;
    paid: boolean;
    paymentMethod?: string;
  }[];
}

interface BillItem {
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export default function BillingPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.tableId as string;
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");

  const fetchSession = useCallback(async () => {
    // Get table to find active session
    const tableRes = await fetch(`/api/tables/${tableId}`);
    if (!tableRes.ok) return;
    const table = await tableRes.json();
    const activeSession = table.sessions[0];
    if (!activeSession) return;

    const res = await fetch(`/api/sessions/${activeSession.id}`);
    if (res.ok) setSession(await res.json());
  }, [tableId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(price);

  // Collect all delivered items
  const deliveredItems: BillItem[] = [];
  session?.orders.forEach((order) => {
    order.items
      .filter((item) => item.status === "DELIVERED" || item.status === "READY")
      .forEach((item) => {
        deliveredItems.push({
          orderId: order.id,
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      });
  });

  const subtotal = deliveredItems.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const existingBillsTotal = session?.bills.reduce((acc, b) => acc + b.total, 0) || 0;
  const remaining = subtotal - existingBillsTotal;

  async function handleGenerateBill() {
    if (!session) return;

    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        items: deliveredItems,
      }),
    });

    if (res.ok) {
      toast.success("Cuenta generada");
      fetchSession();
    } else {
      toast.error("Error al generar cuenta");
    }
  }

  async function handlePayBill(billId: string) {
    const res = await fetch(`/api/billing/${billId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethod }),
    });

    if (res.ok) {
      toast.success("Pago registrado");
      fetchSession();
    } else {
      toast.error("Error al registrar pago");
    }
  }

  async function handleCloseSession() {
    if (!session) return;
    const res = await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CLOSED" }),
    });
    if (res.ok) {
      toast.success("Mesa cerrada");
      router.push("/floor");
    }
  }

  if (!session) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  const allPaid = session.bills.length > 0 && session.bills.every((b) => b.paid);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href={`/tables/${tableId}`}>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold">Cuenta - Mesa {session.table.label}</h2>
          <p className="text-sm text-muted-foreground">{session.guests} comensales · {session.waiter.name}</p>
        </div>
      </div>

      {/* Items summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle de consumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {deliveredItems.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{item.quantity}x {item.productName}</span>
              <span className="font-medium">{formatPrice(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {deliveredItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No hay items para facturar</p>
          )}
        </CardContent>
      </Card>

      {/* Bills */}
      {session.bills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cuentas generadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {session.bills.map((bill) => (
              <div key={bill.id} className="border rounded-md p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{formatPrice(bill.total)}</span>
                  {bill.paid ? (
                    <Badge className="bg-green-600 gap-1"><Check className="h-3 w-3" /> Pagada - {bill.paymentMethod}</Badge>
                  ) : (
                    <Badge variant="destructive">Pendiente</Badge>
                  )}
                </div>
                {!bill.paid && (
                  <div className="flex gap-2">
                    <Select value={paymentMethod} onValueChange={(v) => v && setPaymentMethod(v)}>
                      <SelectTrigger className="h-10 flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH"><span className="flex items-center gap-2"><Banknote className="h-4 w-4" />Efectivo</span></SelectItem>
                        <SelectItem value="CARD"><span className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Tarjeta</span></SelectItem>
                        <SelectItem value="TRANSFER"><span className="flex items-center gap-2"><Smartphone className="h-4 w-4" />Transferencia</span></SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => handlePayBill(bill.id)} className="h-10 gap-2">
                      <Check className="h-4 w-4" /> Cobrar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {session.bills.length === 0 && deliveredItems.length > 0 && (
          <Button onClick={handleGenerateBill} className="h-12 text-base">
            Generar Cuenta
          </Button>
        )}
        {allPaid && (
          <Button onClick={handleCloseSession} variant="destructive" className="h-12 text-base">
            Cerrar Mesa
          </Button>
        )}
      </div>
    </div>
  );
}
