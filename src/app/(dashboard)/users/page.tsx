"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  pin?: string;
  active: boolean;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  WAITER: "Mozo",
  CASHIER: "Cajero",
};

const roleBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ADMIN: "destructive",
  MANAGER: "default",
  WAITER: "secondary",
  CASHIER: "outline",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      name: form.get("name") as string,
      email: form.get("email") as string,
      role: form.get("role") as string,
      pin: (form.get("pin") as string) || undefined,
    };
    const password = form.get("password") as string;
    if (password) data.password = password;

    const url = editing ? `/api/users/${editing.id}` : "/api/users";
    const method = editing ? "PUT" : "POST";

    if (!editing && !password) {
      toast.error("La contraseña es requerida");
      return;
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success(editing ? "Usuario actualizado" : "Usuario creado");
      setDialogOpen(false);
      setEditing(null);
      fetchUsers();
    } else {
      const err = await res.json();
      toast.error(err.error || "Error al guardar");
    }
  }

  async function toggleActive(user: User) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    if (res.ok) {
      toast.success(user.active ? "Usuario desactivado" : "Usuario activado");
      fetchUsers();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Usuarios</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}>
          <DialogTrigger render={<Button className="h-11 gap-2" />}>
              <Plus className="h-4 w-4" />
              Nuevo Usuario
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" required defaultValue={editing?.name} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required defaultValue={editing?.email} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña {editing && "(dejar vacío para no cambiar)"}</Label>
                <Input id="password" name="password" type="password" className="h-11" {...(!editing ? { required: true } : {})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select name="role" defaultValue={editing?.role || "WAITER"}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                      <SelectItem value="MANAGER">Gerente</SelectItem>
                      <SelectItem value="WAITER">Mozo</SelectItem>
                      <SelectItem value="CASHIER">Cajero</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin">PIN (4 dígitos)</Label>
                  <Input id="pin" name="pin" maxLength={4} pattern="[0-9]{4}" defaultValue={editing?.pin} className="h-11 font-mono" />
                </div>
              </div>
              <Button type="submit" className="w-full h-11">
                {editing ? "Actualizar" : "Crear"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className={cn("border rounded-lg p-4 flex items-center justify-between", !user.active && "opacity-60")}>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{user.name}</p>
                <Badge variant={roleBadgeVariant[user.role]}>{roleLabels[user.role]}</Badge>
                {!user.active && <Badge variant="destructive">Inactivo</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {user.pin && <p className="text-xs text-muted-foreground">PIN: {user.pin}</p>}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => { setEditing(user); setDialogOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => toggleActive(user)}>
                {user.active ? <UserX className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4 text-green-600" />}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
