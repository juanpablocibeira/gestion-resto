let _prisma: any;

export function getPrisma() {
  if (!_prisma) {
    // Dynamic import to avoid module evaluation at build time
    const { PrismaClient } = require("@/generated/prisma");
    _prisma = new PrismaClient();
  }
  return _prisma;
}

// Default export as a getter proxy for backward compatibility
export const prisma = new Proxy(
  {},
  {
    get(_, prop) {
      const client = getPrisma();
      const value = client[prop];
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    },
  }
) as any;
