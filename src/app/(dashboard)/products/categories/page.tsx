"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  sortOrder: number;
  _count: { products: number };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    if (res.ok) setCategories(await res.json());
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      sortOrder: parseInt(form.get("sortOrder") as string) || 0,
    };

    const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success(editing ? "Categoria actualizada" : "Categoria creada");
      setDialogOpen(false);
      setEditing(null);
      fetchCategories();
    } else {
      toast.error("Error al guardar categoria");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta categoria?")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Categoria eliminada");
      fetchCategories();
    } else {
      toast.error("Error: puede tener productos asociados");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Categorias</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}>
          <DialogTrigger render={<Button className="h-11 gap-2" />}>
              <Plus className="h-4 w-4" />
              Nueva Categoria
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Categoria" : "Nueva Categoria"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" required defaultValue={editing?.name} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Orden</Label>
                <Input id="sortOrder" name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? 0} className="h-11" />
              </div>
              <Button type="submit" className="w-full h-11">
                {editing ? "Actualizar" : "Crear"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="border rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{cat.name}</p>
              <p className="text-sm text-muted-foreground">{cat._count.products} productos · Orden: {cat.sortOrder}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => { setEditing(cat); setDialogOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => handleDelete(cat.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No hay categorias</p>
        )}
      </div>
    </div>
  );
}
