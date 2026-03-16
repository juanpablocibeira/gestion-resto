"use client";

import { useState, useCallback, useRef } from "react";
import type { KitchenOrderView } from "@/types";

export function useKitchenOrders(initialOrders: KitchenOrderView[]) {
  const [orders, setOrders] = useState<KitchenOrderView[]>(initialOrders);
  const audioRef = useRef<AudioContext | null>(null);

  const playNotification = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new AudioContext();
      }
      const ctx = audioRef.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gain.gain.value = 0.3;
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio not available
    }
  }, []);

  const handleEvent = useCallback(
    (event: string, data: unknown) => {
      const payload = data as Record<string, unknown>;

      if (event === "order:new") {
        const newOrder: KitchenOrderView = {
          id: payload.id as string,
          orderNumber: payload.orderNumber as number,
          tableLabel: payload.tableLabel as string,
          waiterName: payload.waiterName as string,
          status: "SENT",
          notes: payload.notes as string | undefined,
          createdAt: payload.createdAt as string,
          items: (payload.items as Array<Record<string, unknown>>).map((i) => ({
            id: i.id as string,
            productName: i.productName as string,
            quantity: i.quantity as number,
            notes: i.notes as string | undefined,
            status: i.status as string,
          })),
        };
        setOrders((prev) => [newOrder, ...prev]);
        playNotification();
      }

      if (event === "item:update") {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === payload.orderId
              ? {
                  ...order,
                  items: order.items.map((item) =>
                    item.id === payload.itemId
                      ? { ...item, status: payload.status as string }
                      : item
                  ),
                }
              : order
          )
        );
      }

      if (event === "order:ready" || event === "order:delivered") {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === payload.id
              ? { ...order, status: event === "order:ready" ? "READY" : "DELIVERED" }
              : order
          )
        );
      }
    },
    [playNotification]
  );

  return { orders, setOrders, handleEvent };
}
