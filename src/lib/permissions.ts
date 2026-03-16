type Role = "ADMIN" | "MANAGER" | "WAITER" | "CASHIER";

const permissions: Record<string, Role[]> = {
  "floor:edit": ["ADMIN", "MANAGER"],
  "table:manage": ["ADMIN", "MANAGER", "WAITER"],
  "order:create": ["ADMIN", "MANAGER", "WAITER"],
  "order:view": ["ADMIN", "MANAGER", "WAITER"],
  "kitchen:view": ["ADMIN", "MANAGER", "WAITER"],
  "kitchen:update": ["ADMIN", "MANAGER"],
  "billing:manage": ["ADMIN", "MANAGER", "CASHIER"],
  "product:manage": ["ADMIN", "MANAGER"],
  "user:manage": ["ADMIN"],
  "settings:manage": ["ADMIN"],
};

export function hasPermission(role: string, action: string): boolean {
  const allowedRoles = permissions[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role as Role);
}

export function requirePermission(role: string, action: string): void {
  if (!hasPermission(role, action)) {
    throw new Error(`Forbidden: role ${role} cannot perform ${action}`);
  }
}
