"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSSE } from "@/hooks/useSSE";
import { cn } from "@/lib/utils";
import { Users, Pencil } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface TableData {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: string;
  seats: number;
  sessions: {
    id: string;
    status: string;
    guests: number;
    waiter: { name: string };
  }[];
}

type TableStatus = "free" | "occupied" | "waiting_food" | "waiting_bill";

function getTableStatus(table: TableData): TableStatus {
  const session = table.sessions[0];
  if (!session) return "free";
  const map: Record<string, TableStatus> = {
    OPEN: "occupied",
    WAITING_FOOD: "waiting_food",
    WAITING_BILL: "waiting_bill",
  };
  return map[session.status] || "free";
}

const statusColors: Record<TableStatus, string> = {
  free: "bg-green-100 border-green-300 text-green-800",
  occupied: "bg-blue-100 border-blue-300 text-blue-800",
  waiting_food: "bg-amber-100 border-amber-300 text-amber-800",
  waiting_bill: "bg-purple-100 border-purple-300 text-purple-800",
};

const statusLabels: Record<TableStatus, string> = {
  free: "Libre",
  occupied: "Ocupada",
  waiting_food: "Esperando comida",
  waiting_bill: "Esperando cuenta",
};

export default function FloorPage() {
  const router = useRouter();
  const [tables, setTables] = useState<TableData[]>([]);
  const [openDialogTable, setOpenDialogTable] = useState<TableData | null>(null);
  const [guests, setGuests] = useState(2);

  const fetchTables = useCallback(async () => {
    const res = await fetch("/api/tables");
    if (res.ok) setTables(await res.json());
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useSSE({
    url: "/api/sse/floor",
    onEvent: () => {
      fetchTables();
    },
  });

  async function handleOpenSession() {
    if (!openDialogTable) return;
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: openDialogTable.id, guests }),
    });
    if (res.ok) {
      const session = await res.json();
      toast.success(`Mesa ${openDialogTable.label} abierta`);
      setOpenDialogTable(null);
      router.push(`/tables/${openDialogTable.id}`);
    } else {
      const err = await res.json();
      toast.error(err.error || "Error al abrir mesa");
    }
  }

  function handleTableClick(table: TableData) {
    const status = getTableStatus(table);
    if (status === "free") {
      setOpenDialogTable(table);
      setGuests(2);
    } else {
      router.push(`/tables/${table.id}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Salon</h2>
        <Link href="/floor/editor">
          <Button variant="outline" className="h-11 gap-2">
            <Pencil className="h-4 w-4" />
            Editor
          </Button>
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap">
        {Object.entries(statusLabels).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <div className={cn("w-4 h-4 rounded border", statusColors[key as TableStatus])} />
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables.map((table) => {
          const status = getTableStatus(table);
          const session = table.sessions[0];
          return (
            <Card
              key={table.id}
              className={cn(
                "cursor-pointer transition-all active:scale-95 touch-manipulation select-none border-2",
                statusColors[status]
              )}
              onClick={() => handleTableClick(table)}
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{table.label}</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Users className="h-3 w-3" />
                  <span className="text-xs">{session?.guests || 0}/{table.seats}</span>
                </div>
                <Badge variant="outline" className="mt-2 text-xs">
                  {statusLabels[status]}
                </Badge>
                {session?.waiter && (
                  <p className="text-xs mt-1 opacity-75">{session.waiter.name}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!openDialogTable} onOpenChange={(open) => !open && setOpenDialogTable(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Abrir Mesa {openDialogTable?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cantidad de comensales</Label>
              <Input
                type="number"
                min={1}
                max={openDialogTable?.seats || 20}
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                className="h-12 text-lg text-center"
              />
            </div>
            <Button onClick={handleOpenSession} className="w-full h-12 text-base">
              Abrir Mesa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
