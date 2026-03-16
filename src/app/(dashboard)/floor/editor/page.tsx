"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Save, Trash2, Square, Circle, RectangleHorizontal } from "lucide-react";
import { toast } from "sonner";

interface TableData {
  id?: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: "RECTANGLE" | "CIRCLE" | "SQUARE";
  seats: number;
}

interface FloorPlan {
  id: string;
  name: string;
  width: number;
  height: number;
  tables: TableData[];
}

export default function FloorEditorPage() {
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [activePlan, setActivePlan] = useState<FloorPlan | null>(null);
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState<{ index: number; offsetX: number; offsetY: number } | null>(null);

  const fetchPlans = useCallback(async () => {
    const res = await fetch("/api/floor-plans");
    if (res.ok) {
      const data = await res.json();
      setPlans(data);
      if (data.length > 0 && !activePlan) {
        setActivePlan(data[0]);
        setTables(data[0].tables || []);
      }
    }
  }, [activePlan]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  function addTable(shape: "RECTANGLE" | "CIRCLE" | "SQUARE") {
    const label = String(tables.length + 1);
    const newTable: TableData = {
      label,
      x: 50 + Math.random() * 200,
      y: 50 + Math.random() * 200,
      width: shape === "RECTANGLE" ? 120 : 80,
      height: 80,
      rotation: 0,
      shape,
      seats: shape === "RECTANGLE" ? 6 : 4,
    };
    setTables([...tables, newTable]);
    setSelectedIndex(tables.length);
  }

  function updateSelected(updates: Partial<TableData>) {
    if (selectedIndex === null) return;
    const updated = [...tables];
    updated[selectedIndex] = { ...updated[selectedIndex], ...updates };
    setTables(updated);
  }

  function deleteSelected() {
    if (selectedIndex === null) return;
    setTables(tables.filter((_, i) => i !== selectedIndex));
    setSelectedIndex(null);
  }

  async function handleSave() {
    if (!activePlan) return;

    // Delete existing tables and recreate
    for (const table of activePlan.tables || []) {
      if (table.id) {
        await fetch(`/api/tables/${table.id}`, { method: "DELETE" });
      }
    }

    // Create new tables
    for (const table of tables) {
      await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...table, floorPlanId: activePlan.id }),
      });
    }

    toast.success("Plano guardado");
    fetchPlans();
  }

  function handleCanvasMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on a table
    for (let i = tables.length - 1; i >= 0; i--) {
      const t = tables[i];
      if (x >= t.x && x <= t.x + t.width && y >= t.y && y <= t.y + t.height) {
        setSelectedIndex(i);
        setDragging({ index: i, offsetX: x - t.x, offsetY: y - t.y });
        return;
      }
    }
    setSelectedIndex(null);
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - dragging.offsetX;
    const y = e.clientY - rect.top - dragging.offsetY;
    const updated = [...tables];
    updated[dragging.index] = { ...updated[dragging.index], x: Math.max(0, x), y: Math.max(0, y) };
    setTables(updated);
  }

  function handleCanvasMouseUp() {
    setDragging(null);
  }

  const selected = selectedIndex !== null ? tables[selectedIndex] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Editor de Plano</h2>
        <Button onClick={handleSave} className="h-11 gap-2">
          <Save className="h-4 w-4" />
          Guardar
        </Button>
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Canvas */}
        <div className="flex-1">
          <div className="mb-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => addTable("SQUARE")} className="gap-1">
              <Square className="h-4 w-4" /> Mesa cuadrada
            </Button>
            <Button variant="outline" size="sm" onClick={() => addTable("RECTANGLE")} className="gap-1">
              <RectangleHorizontal className="h-4 w-4" /> Mesa rectangular
            </Button>
            <Button variant="outline" size="sm" onClick={() => addTable("CIRCLE")} className="gap-1">
              <Circle className="h-4 w-4" /> Mesa redonda
            </Button>
          </div>
          <div
            className="relative bg-muted border rounded-lg overflow-hidden cursor-crosshair"
            style={{ width: "100%", height: 600 }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            {tables.map((table, i) => (
              <div
                key={i}
                className={cn(
                  "absolute flex items-center justify-center border-2 font-bold text-sm select-none",
                  "bg-white shadow-sm transition-shadow",
                  table.shape === "CIRCLE" ? "rounded-full" : "rounded-md",
                  selectedIndex === i ? "border-primary ring-2 ring-primary/30 shadow-md" : "border-border"
                )}
                style={{
                  left: table.x,
                  top: table.y,
                  width: table.width,
                  height: table.height,
                  transform: `rotate(${table.rotation}deg)`,
                }}
              >
                {table.label}
              </div>
            ))}
          </div>
        </div>

        {/* Properties panel */}
        <Card className="w-full lg:w-72 shrink-0">
          <CardHeader>
            <CardTitle className="text-base">Propiedades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selected ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Etiqueta</Label>
                  <Input value={selected.label} onChange={(e) => updateSelected({ label: e.target.value })} className="h-9" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Ancho</Label>
                    <Input type="number" value={selected.width} onChange={(e) => updateSelected({ width: parseInt(e.target.value) || 80 })} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Alto</Label>
                    <Input type="number" value={selected.height} onChange={(e) => updateSelected({ height: parseInt(e.target.value) || 80 })} className="h-9" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rotacion</Label>
                  <Input type="number" value={selected.rotation} onChange={(e) => updateSelected({ rotation: parseInt(e.target.value) || 0 })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Asientos</Label>
                  <Input type="number" value={selected.seats} onChange={(e) => updateSelected({ seats: parseInt(e.target.value) || 1 })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Forma</Label>
                  <Select value={selected.shape} onValueChange={(v) => { if (v !== null) updateSelected({ shape: v as TableData["shape"] }); }}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SQUARE">Cuadrada</SelectItem>
                      <SelectItem value="RECTANGLE">Rectangular</SelectItem>
                      <SelectItem value="CIRCLE">Redonda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="destructive" size="sm" className="w-full gap-1" onClick={deleteSelected}>
                  <Trash2 className="h-4 w-4" /> Eliminar mesa
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Selecciona una mesa para editarla</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
