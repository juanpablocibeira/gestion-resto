"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  UtensilsCrossed,
  MapPin,
  ChefHat,
  Receipt,
  Package,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
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

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar h-screen sticky top-0">
      <div className="p-4 border-b">
        <h1 className="font-bold text-lg flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5" />
          Gestión Resto
        </h1>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t space-y-2">
        <div className="text-sm">
          <p className="font-medium truncate">{userName}</p>
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
    </aside>
  );
}
