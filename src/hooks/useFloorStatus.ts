"use client";

import { useState, useCallback } from "react";
import { useSSE } from "./useSSE";
import type { FloorTableView } from "@/types";

export function useFloorStatus(initialTables: FloorTableView[]) {
  const [tables, setTables] = useState<FloorTableView[]>(initialTables);

  const handleEvent = useCallback((event: string, data: unknown) => {
    const payload = data as Record<string, unknown>;

    if (event === "session:open") {
      setTables((prev) =>
        prev.map((t) =>
          t.id === payload.tableId
            ? {
                ...t,
                status: "occupied" as const,
                sessionId: payload.sessionId as string,
                waiterName: payload.waiterName as string,
                guests: payload.guests as number,
              }
            : t
        )
      );
    }

    if (event === "session:update") {
      const statusMap: Record<string, FloorTableView["status"]> = {
        OPEN: "occupied",
        WAITING_FOOD: "waiting_food",
        WAITING_BILL: "waiting_bill",
        CLOSED: "free",
      };
      setTables((prev) =>
        prev.map((t) =>
          t.id === payload.tableId
            ? {
                ...t,
                status: statusMap[payload.status as string] || "free",
                ...(payload.status === "CLOSED"
                  ? { sessionId: undefined, waiterName: undefined, guests: undefined }
                  : {}),
              }
            : t
        )
      );
    }

    if (event === "order:ready") {
      // Could add visual indicator for ready orders
    }
  }, []);

  useSSE({
    url: "/api/sse/floor",
    onEvent: handleEvent,
  });

  return tables;
}
