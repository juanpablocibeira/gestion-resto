import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  // Create restaurant
  const restaurant = await prisma.restaurant.upsert({
    where: { id: "default-restaurant" },
    update: {},
    create: {
      id: "default-restaurant",
      name: "Mi Restaurante",
      address: "Calle Principal 123",
      phone: "+54 11 1234-5678",
    },
  });

  // Create admin user (password: admin123)
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@resto.com" },
    update: {},
    create: {
      email: "admin@resto.com",
      name: "Administrador",
      passwordHash,
      pin: "0000",
      role: "ADMIN",
      restaurantId: restaurant.id,
    },
  });

  // Create waiter
  const waiterHash = await bcrypt.hash("mozo123", 10);
  await prisma.user.upsert({
    where: { email: "mozo@resto.com" },
    update: {},
    create: {
      email: "mozo@resto.com",
      name: "Carlos Mozo",
      passwordHash: waiterHash,
      pin: "1234",
      role: "WAITER",
      restaurantId: restaurant.id,
    },
  });

  // Create cashier
  const cashierHash = await bcrypt.hash("cajero123", 10);
  await prisma.user.upsert({
    where: { email: "cajero@resto.com" },
    update: {},
    create: {
      email: "cajero@resto.com",
      name: "Maria Cajera",
      passwordHash: cashierHash,
      pin: "5678",
      role: "CASHIER",
      restaurantId: restaurant.id,
    },
  });

  // Create categories
  const categories = [
    { name: "Bebidas", sortOrder: 1 },
    { name: "Entradas", sortOrder: 2 },
    { name: "Principales", sortOrder: 3 },
    { name: "Postres", sortOrder: 4 },
    { name: "Guarniciones", sortOrder: 5 },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { id: `cat-${cat.name.toLowerCase()}` },
      update: {},
      create: {
        id: `cat-${cat.name.toLowerCase()}`,
        name: cat.name,
        sortOrder: cat.sortOrder,
        restaurantId: restaurant.id,
      },
    });
    createdCategories[cat.name] = created.id;
  }

  // Create products
  const products = [
    { name: "Coca-Cola", price: 2500, categoryId: createdCategories["Bebidas"], printInKitchen: false },
    { name: "Agua Mineral", price: 1800, categoryId: createdCategories["Bebidas"], printInKitchen: false },
    { name: "Cerveza Artesanal", price: 4500, categoryId: createdCategories["Bebidas"], printInKitchen: false },
    { name: "Vino Malbec Copa", price: 5000, categoryId: createdCategories["Bebidas"], printInKitchen: false },
    { name: "Limonada", price: 3000, categoryId: createdCategories["Bebidas"], printInKitchen: false },
    { name: "Empanadas (x3)", price: 4500, categoryId: createdCategories["Entradas"] },
    { name: "Provoleta", price: 5500, categoryId: createdCategories["Entradas"] },
    { name: "Bruschetta", price: 4000, categoryId: createdCategories["Entradas"] },
    { name: "Tabla de Fiambres", price: 8500, categoryId: createdCategories["Entradas"] },
    { name: "Bife de Chorizo", price: 15000, categoryId: createdCategories["Principales"] },
    { name: "Milanesa Napolitana", price: 12000, categoryId: createdCategories["Principales"] },
    { name: "Pasta del Dia", price: 10000, categoryId: createdCategories["Principales"] },
    { name: "Salmon Grillado", price: 16000, categoryId: createdCategories["Principales"] },
    { name: "Pollo al Verdeo", price: 11000, categoryId: createdCategories["Principales"] },
    { name: "Ensalada Caesar", price: 8000, categoryId: createdCategories["Principales"] },
    { name: "Flan con Dulce de Leche", price: 4500, categoryId: createdCategories["Postres"] },
    { name: "Tiramisú", price: 5500, categoryId: createdCategories["Postres"] },
    { name: "Helado (3 bochas)", price: 5000, categoryId: createdCategories["Postres"] },
    { name: "Papas Fritas", price: 4000, categoryId: createdCategories["Guarniciones"] },
    { name: "Ensalada Mixta", price: 3500, categoryId: createdCategories["Guarniciones"] },
    { name: "Puré de Papas", price: 3500, categoryId: createdCategories["Guarniciones"] },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { id: `prod-${prod.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}` },
      update: {},
      create: {
        id: `prod-${prod.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        name: prod.name,
        price: prod.price,
        printInKitchen: prod.printInKitchen ?? true,
        categoryId: prod.categoryId,
        restaurantId: restaurant.id,
      },
    });
  }

  // Create a default floor plan with some tables
  const floorPlan = await prisma.floorPlan.upsert({
    where: { id: "default-floor" },
    update: {},
    create: {
      id: "default-floor",
      name: "Salón Principal",
      width: 1200,
      height: 800,
      restaurantId: restaurant.id,
    },
  });

  const tables = [
    { label: "1", x: 100, y: 100, width: 80, height: 80, shape: "SQUARE" as const, seats: 4 },
    { label: "2", x: 250, y: 100, width: 80, height: 80, shape: "SQUARE" as const, seats: 4 },
    { label: "3", x: 400, y: 100, width: 80, height: 80, shape: "SQUARE" as const, seats: 4 },
    { label: "4", x: 100, y: 300, width: 120, height: 80, shape: "RECTANGLE" as const, seats: 6 },
    { label: "5", x: 300, y: 300, width: 120, height: 80, shape: "RECTANGLE" as const, seats: 6 },
    { label: "6", x: 550, y: 200, width: 100, height: 100, shape: "CIRCLE" as const, seats: 8 },
    { label: "7", x: 100, y: 500, width: 80, height: 80, shape: "SQUARE" as const, seats: 2 },
    { label: "8", x: 250, y: 500, width: 80, height: 80, shape: "SQUARE" as const, seats: 2 },
    { label: "9", x: 450, y: 500, width: 160, height: 80, shape: "RECTANGLE" as const, seats: 10 },
  ];

  for (const table of tables) {
    await prisma.restaurantTable.upsert({
      where: { id: `table-${table.label}` },
      update: {},
      create: {
        id: `table-${table.label}`,
        label: table.label,
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height,
        shape: table.shape,
        seats: table.seats,
        floorPlanId: floorPlan.id,
        restaurantId: restaurant.id,
      },
    });
  }

  console.log("Seed completed successfully!");
  console.log("Admin login: admin@resto.com / admin123 (PIN: 0000)");
  console.log("Waiter login: mozo@resto.com / mozo123 (PIN: 1234)");
  console.log("Cashier login: cajero@resto.com / cajero123 (PIN: 5678)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
