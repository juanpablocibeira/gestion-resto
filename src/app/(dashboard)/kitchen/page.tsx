"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSSE } from "@/hooks/useSSE";
import { cn } from "@/lib/utils";
import { Check, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface KitchenOrder {
  id: string;
  orderNumber: number;
  status: string;
  notes?: string;
  createdAt: string;
  session: { table: { label: string } };
  waiter: { name: string };
  items: {
    id: string;
    quantity: number;
    notes?: string;
    status: string;
    product: { name: string; printInKitchen: boolean };
  }[];
}

function getTimeColor(createdAt: string): string {
  const minutes = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (minutes < 5) return "bg-white";
  if (minutes < 10) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [, setTick] = useState(0);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/orders?status=SENT");
    if (res.ok) {
      const sent = await res.json();
      const res2 = await fetch("/api/orders?status=IN_PROGRESS");
      const inProgress = res2.ok ? await res2.json() : [];
      const res3 = await fetch("/api/orders?status=READY");
      const ready = res3.ok ? await res3.json() : [];
      setOrders([...sent, ...inProgress, ...ready]);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Refresh time display every 30s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Audio notification
  const playSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } catch { /* */ }
  }, []);

  useSSE({
    url: "/api/sse/kitchen",
    onEvent: (event) => {
      if (event === "order:new") {
        playSound();
      }
      fetchOrders();
    },
  });

  async function markItemReady(orderId: string, itemId: string) {
    const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "READY" }),
    });
    if (res.ok) {
      fetchOrders();
    }
  }

  async function markOrderDelivered(orderId: string) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DELIVERED" }),
    });
    if (res.ok) {
      toast.success("Pedido marcado como entregado");
      fetchOrders();
    }
  }

  const activeOrders = orders.filter((o) => o.status !== "DELIVERED");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cocina</h2>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {activeOrders.length} pedidos activos
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeOrders.map((order) => {
          const kitchenItems = order.items.filter((i) => i.product.printInKitchen);
          const allReady = kitchenItems.every((i) => i.status === "READY");

          return (
            <Card key={order.id} className={cn("border-2 transition-colors", getTimeColor(order.createdAt))}>
              <CardHeader className="pb-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">#{order.orderNumber}</span>
                  <Badge variant={order.status === "READY" ? "default" : "secondary"}>
                    {order.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Mesa {order.session.table.label}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(order.createdAt), { locale: es, addSuffix: false })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{order.waiter.name}</p>
                {order.notes && <p className="text-xs font-medium text-amber-700 bg-amber-50 rounded px-2 py-1">{order.notes}</p>}
              </CardHeader>
              <CardContent className="space-y-2">
                {kitchenItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md border",
                      item.status === "READY" ? "bg-green-50 border-green-200" : "bg-white"
                    )}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        <span className="font-bold mr-1">{item.quantity}x</span>
                        {item.product.name}
                      </p>
                      {item.notes && <p className="text-xs text-amber-600">{item.notes}</p>}
                    </div>
                    {item.status !== "READY" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 w-10 p-0 touch-manipulation"
                        onClick={() => markItemReady(order.id, item.id)}
                      >
                        <Check className="h-5 w-5" />
                      </Button>
                    )}
                    {item.status === "READY" && (
                      <Badge variant="default" className="bg-green-600">Listo</Badge>
                    )}
                  </div>
                ))}

                {allReady && order.status === "READY" && (
                  <Button
                    className="w-full h-11 mt-2"
                    onClick={() => markOrderDelivered(order.id)}
                  >
                    Marcar Entregado
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}

        {activeOrders.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <p className="text-lg">No hay pedidos pendientes</p>
            <p className="text-sm">Los nuevos pedidos apareceran automaticamente</p>
          </div>
        )}
      </div>
    </div>
  );
}
