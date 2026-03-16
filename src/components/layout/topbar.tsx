"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, UtensilsCrossed, LayoutDashboard, MapPin, ChefHat, Package, Users, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { signOut } from "next-auth/react";
import { useState } from "react";

interface TopbarProps {
  role: string;
  userName: string;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "WAITER", "CASHIER"] },
  { href: "/floor", label: "Salón", icon: MapPin, roles: ["ADMIN", "MANAGER", "WAITER", "CASHIER"] },
  { href: "/kitchen", label: "Cocina", icon: ChefHat, roles: ["ADMIN", "MANAGER", "WAITER"] },
  { href: "/products", label: "Productos", icon: Package, roles: ["ADMIN", "MANAGER"] },
  { href: "/users", label: "Usuarios", icon: Users, roles: ["ADMIN"] },
  { href: "/settings", label: "Configuración", icon: Settings, roles: ["ADMIN"] },
];

export function Topbar({ role, userName }: TopbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <header className="md:hidden flex items-center justify-between border-b px-4 h-14 bg-sidebar sticky top-0 z-50">
      <div className="flex items-center gap-2 font-bold">
        <UtensilsCrossed className="h-5 w-5" />
        Gestión Resto
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" />}>
            <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="p-4 border-b font-bold text-lg">Menú</SheetTitle>
          <nav className="p-2 space-y-1">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                    isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t space-y-2">
            <div className="text-sm">
              <p className="font-medium">{userName}</p>
              <p className="text-muted-foreground text-xs uppercase">{role}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
