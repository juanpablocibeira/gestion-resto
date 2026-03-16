import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const pinLoginSchema = z.object({
  pin: z.string().length(4),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().optional(),
});

export const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().positive(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  available: z.boolean().optional(),
  printInKitchen: z.boolean().optional(),
  categoryId: z.string().min(1),
});

export const tableSchema = z.object({
  label: z.string().min(1).max(20),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().optional(),
  shape: z.enum(["RECTANGLE", "CIRCLE", "SQUARE"]),
  seats: z.number().int().positive(),
  floorPlanId: z.string().min(1),
});

export const floorPlanSchema = z.object({
  name: z.string().min(1).max(100),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const openSessionSchema = z.object({
  tableId: z.string().min(1),
  guests: z.number().int().positive(),
});

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

export const createOrderSchema = z.object({
  sessionId: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  notes: z.string().optional(),
});

export const updateOrderItemStatusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "READY", "DELIVERED", "CANCELLED"]),
});

export const createBillSchema = z.object({
  sessionId: z.string().min(1),
  items: z.array(
    z.object({
      orderId: z.string().min(1),
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive(),
    })
  ),
});

export const payBillSchema = z.object({
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "OTHER"]),
});

export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  password: z.string().min(6),
  pin: z.string().length(4).optional(),
  role: z.enum(["ADMIN", "MANAGER", "WAITER", "CASHIER"]),
});

export const updateUserSchema = userSchema.partial().omit({ password: undefined }).extend({
  password: z.string().min(6).optional(),
});
