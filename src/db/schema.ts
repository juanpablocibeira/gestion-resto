import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────
export const roleEnum = pgEnum("Role", [
  "ADMIN",
  "MANAGER",
  "WAITER",
  "CASHIER",
]);

export const tableShapeEnum = pgEnum("TableShape", [
  "RECTANGLE",
  "CIRCLE",
  "SQUARE",
]);

export const sessionStatusEnum = pgEnum("SessionStatus", [
  "OPEN",
  "WAITING_FOOD",
  "WAITING_BILL",
  "CLOSED",
]);

export const orderStatusEnum = pgEnum("OrderStatus", [
  "DRAFT",
  "SENT",
  "IN_PROGRESS",
  "READY",
  "DELIVERED",
  "CANCELLED",
]);

export const orderItemStatusEnum = pgEnum("OrderItemStatus", [
  "PENDING",
  "IN_PROGRESS",
  "READY",
  "DELIVERED",
  "CANCELLED",
]);

export const paymentMethodEnum = pgEnum("PaymentMethod", [
  "CASH",
  "CARD",
  "TRANSFER",
  "OTHER",
]);

// ── Tables ─────────────────────────────────────────────────────

export const restaurants = pgTable("restaurants", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  taxId: text("tax_id"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  pin: text("pin"),
  role: roleEnum("role").default("WAITER").notNull(),
  active: boolean("active").default(true).notNull(),
  restaurantId: text("restaurant_id").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const floorPlans = pgTable("floor_plans", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  width: integer("width").default(1200).notNull(),
  height: integer("height").default(800).notNull(),
  restaurantId: text("restaurant_id").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const restaurantTables = pgTable("restaurant_tables", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  label: text("label").notNull(),
  x: doublePrecision("x").default(0).notNull(),
  y: doublePrecision("y").default(0).notNull(),
  width: doublePrecision("width").default(80).notNull(),
  height: doublePrecision("height").default(80).notNull(),
  rotation: doublePrecision("rotation").default(0).notNull(),
  shape: tableShapeEnum("shape").default("RECTANGLE").notNull(),
  seats: integer("seats").default(4).notNull(),
  floorPlanId: text("floor_plan_id").notNull(),
  restaurantId: text("restaurant_id").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const tableSessions = pgTable("table_sessions", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  tableId: text("table_id").notNull(),
  waiterId: text("waiter_id").notNull(),
  restaurantId: text("restaurant_id").notNull(),
  guests: integer("guests").default(1).notNull(),
  status: sessionStatusEnum("status").default("OPEN").notNull(),
  openedAt: timestamp("opened_at", { mode: "date" }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { mode: "date" }),
});

export const categories = pgTable("categories", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  restaurantId: text("restaurant_id").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: doublePrecision("price").notNull(),
  imageUrl: text("image_url"),
  available: boolean("available").default(true).notNull(),
  printInKitchen: boolean("print_in_kitchen").default(true).notNull(),
  categoryId: text("category_id").notNull(),
  restaurantId: text("restaurant_id").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  orderNumber: integer("order_number").notNull(),
  sessionId: text("session_id").notNull(),
  waiterId: text("waiter_id").notNull(),
  restaurantId: text("restaurant_id").notNull(),
  status: orderStatusEnum("status").default("DRAFT").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  orderId: text("order_id").notNull(),
  productId: text("product_id").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  notes: text("notes"),
  status: orderItemStatusEnum("status").default("PENDING").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const bills = pgTable("bills", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  sessionId: text("session_id").notNull(),
  restaurantId: text("restaurant_id").notNull(),
  subtotal: doublePrecision("subtotal").default(0).notNull(),
  tax: doublePrecision("tax").default(0).notNull(),
  total: doublePrecision("total").default(0).notNull(),
  paymentMethod: paymentMethodEnum("payment_method"),
  paid: boolean("paid").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const billItems = pgTable("bill_items", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  billId: text("bill_id").notNull(),
  orderId: text("order_id").notNull(),
  productId: text("product_id").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  total: doublePrecision("total").default(0).notNull(),
});

// ── Relations ──────────────────────────────────────────────────

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  users: many(users),
  floorPlans: many(floorPlans),
  tables: many(restaurantTables),
  categories: many(categories),
  products: many(products),
  sessions: many(tableSessions),
  orders: many(orders),
  bills: many(bills),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [users.restaurantId],
    references: [restaurants.id],
  }),
  sessions: many(tableSessions),
  orders: many(orders),
}));

export const floorPlansRelations = relations(floorPlans, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [floorPlans.restaurantId],
    references: [restaurants.id],
  }),
  tables: many(restaurantTables),
}));

export const restaurantTablesRelations = relations(
  restaurantTables,
  ({ one, many }) => ({
    floorPlan: one(floorPlans, {
      fields: [restaurantTables.floorPlanId],
      references: [floorPlans.id],
    }),
    restaurant: one(restaurants, {
      fields: [restaurantTables.restaurantId],
      references: [restaurants.id],
    }),
    sessions: many(tableSessions),
  })
);

export const tableSessionsRelations = relations(
  tableSessions,
  ({ one, many }) => ({
    table: one(restaurantTables, {
      fields: [tableSessions.tableId],
      references: [restaurantTables.id],
    }),
    waiter: one(users, {
      fields: [tableSessions.waiterId],
      references: [users.id],
    }),
    restaurant: one(restaurants, {
      fields: [tableSessions.restaurantId],
      references: [restaurants.id],
    }),
    orders: many(orders),
    bills: many(bills),
  })
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [categories.restaurantId],
    references: [restaurants.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  restaurant: one(restaurants, {
    fields: [products.restaurantId],
    references: [restaurants.id],
  }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  session: one(tableSessions, {
    fields: [orders.sessionId],
    references: [tableSessions.id],
  }),
  waiter: one(users, {
    fields: [orders.waiterId],
    references: [users.id],
  }),
  restaurant: one(restaurants, {
    fields: [orders.restaurantId],
    references: [restaurants.id],
  }),
  items: many(orderItems),
  billItems: many(billItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  session: one(tableSessions, {
    fields: [bills.sessionId],
    references: [tableSessions.id],
  }),
  restaurant: one(restaurants, {
    fields: [bills.restaurantId],
    references: [restaurants.id],
  }),
  items: many(billItems),
}));

export const billItemsRelations = relations(billItems, ({ one }) => ({
  bill: one(bills, {
    fields: [billItems.billId],
    references: [bills.id],
  }),
  order: one(orders, {
    fields: [billItems.orderId],
    references: [orders.id],
  }),
}));
