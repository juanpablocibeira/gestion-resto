import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import {
  restaurants,
  users,
  categories,
  products,
  floorPlans,
  restaurantTables,
} from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: process.env.DATABASE_URL ? "SET (" + process.env.DATABASE_URL.substring(0, 30) + "...)" : "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
  });
}

export async function POST() {
  try {
    // Create restaurant
    const [restaurant] = await db
      .insert(restaurants)
      .values({
        id: "default-restaurant",
        name: "Mi Restaurante",
        address: "Calle Principal 123",
        phone: "+54 11 1234-5678",
      })
      .onConflictDoUpdate({
        target: restaurants.id,
        set: { name: "Mi Restaurante" },
      })
      .returning();

    // Create admin user
    const adminHash = await bcrypt.hash("admin123", 10);
    await db
      .insert(users)
      .values({
        email: "admin@resto.com",
        name: "Administrador",
        passwordHash: adminHash,
        pin: "0000",
        role: "ADMIN",
        restaurantId: restaurant.id,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { name: "Administrador", passwordHash: adminHash, pin: "0000", role: "ADMIN" },
      });

    // Create waiter
    const waiterHash = await bcrypt.hash("mozo123", 10);
    await db
      .insert(users)
      .values({
        email: "mozo@resto.com",
        name: "Carlos Mozo",
        passwordHash: waiterHash,
        pin: "1234",
        role: "WAITER",
        restaurantId: restaurant.id,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { name: "Carlos Mozo", passwordHash: waiterHash, pin: "1234", role: "WAITER" },
      });

    // Create cashier
    const cashierHash = await bcrypt.hash("cajero123", 10);
    await db
      .insert(users)
      .values({
        email: "cajero@resto.com",
        name: "Maria Cajera",
        passwordHash: cashierHash,
        pin: "5678",
        role: "CASHIER",
        restaurantId: restaurant.id,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { name: "Maria Cajera", passwordHash: cashierHash, pin: "5678", role: "CASHIER" },
      });

    // Create categories
    const categoryList = [
      { id: "cat-bebidas", name: "Bebidas", sortOrder: 1 },
      { id: "cat-entradas", name: "Entradas", sortOrder: 2 },
      { id: "cat-principales", name: "Principales", sortOrder: 3 },
      { id: "cat-postres", name: "Postres", sortOrder: 4 },
      { id: "cat-guarniciones", name: "Guarniciones", sortOrder: 5 },
    ];

    for (const cat of categoryList) {
      await db
        .insert(categories)
        .values({ ...cat, restaurantId: restaurant.id })
        .onConflictDoUpdate({
          target: categories.id,
          set: { name: cat.name, sortOrder: cat.sortOrder },
        });
    }

    // Create products
    const productList = [
      { name: "Coca-Cola", price: 2500, categoryId: "cat-bebidas", printInKitchen: false },
      { name: "Agua Mineral", price: 1800, categoryId: "cat-bebidas", printInKitchen: false },
      { name: "Cerveza Artesanal", price: 4500, categoryId: "cat-bebidas", printInKitchen: false },
      { name: "Vino Malbec Copa", price: 5000, categoryId: "cat-bebidas", printInKitchen: false },
      { name: "Limonada", price: 3000, categoryId: "cat-bebidas", printInKitchen: false },
      { name: "Empanadas (x3)", price: 4500, categoryId: "cat-entradas", printInKitchen: true },
      { name: "Provoleta", price: 5500, categoryId: "cat-entradas", printInKitchen: true },
      { name: "Bruschetta", price: 4000, categoryId: "cat-entradas", printInKitchen: true },
      { name: "Tabla de Fiambres", price: 8500, categoryId: "cat-entradas", printInKitchen: true },
      { name: "Bife de Chorizo", price: 15000, categoryId: "cat-principales", printInKitchen: true },
      { name: "Milanesa Napolitana", price: 12000, categoryId: "cat-principales", printInKitchen: true },
      { name: "Pasta del Dia", price: 10000, categoryId: "cat-principales", printInKitchen: true },
      { name: "Salmon Grillado", price: 16000, categoryId: "cat-principales", printInKitchen: true },
      { name: "Pollo al Verdeo", price: 11000, categoryId: "cat-principales", printInKitchen: true },
      { name: "Ensalada Caesar", price: 8000, categoryId: "cat-principales", printInKitchen: true },
      { name: "Flan con Dulce de Leche", price: 4500, categoryId: "cat-postres", printInKitchen: true },
      { name: "Tiramisú", price: 5500, categoryId: "cat-postres", printInKitchen: true },
      { name: "Helado (3 bochas)", price: 5000, categoryId: "cat-postres", printInKitchen: true },
      { name: "Papas Fritas", price: 4000, categoryId: "cat-guarniciones", printInKitchen: true },
      { name: "Ensalada Mixta", price: 3500, categoryId: "cat-guarniciones", printInKitchen: true },
      { name: "Puré de Papas", price: 3500, categoryId: "cat-guarniciones", printInKitchen: true },
    ];

    for (const prod of productList) {
      const id = `prod-${prod.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      await db
        .insert(products)
        .values({
          id,
          name: prod.name,
          price: prod.price,
          printInKitchen: prod.printInKitchen,
          categoryId: prod.categoryId,
          restaurantId: restaurant.id,
        })
        .onConflictDoUpdate({
          target: products.id,
          set: { name: prod.name, price: prod.price, printInKitchen: prod.printInKitchen },
        });
    }

    // Create floor plan
    const [floorPlan] = await db
      .insert(floorPlans)
      .values({
        id: "default-floor",
        name: "Salón Principal",
        width: 1200,
        height: 800,
        restaurantId: restaurant.id,
      })
      .onConflictDoUpdate({
        target: floorPlans.id,
        set: { name: "Salón Principal" },
      })
      .returning();

    // Create tables
    const tableList = [
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

    for (const table of tableList) {
      await db
        .insert(restaurantTables)
        .values({
          id: `table-${table.label}`,
          ...table,
          floorPlanId: floorPlan.id,
          restaurantId: restaurant.id,
        })
        .onConflictDoUpdate({
          target: restaurantTables.id,
          set: table,
        });
    }

    return NextResponse.json({
      ok: true,
      message: "Seed completed",
      data: {
        restaurant: restaurant.name,
        users: 3,
        categories: categoryList.length,
        products: productList.length,
        tables: tableList.length,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
