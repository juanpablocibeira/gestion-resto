import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { eq, asc } from "drizzle-orm";
import { users } from "@/db/schema";
import { userSchema } from "@/lib/validators";
import { hasPermission } from "@/lib/permissions";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "user:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await db.query.users.findMany({
    where: eq(users.restaurantId, session.user.restaurantId),
    columns: {
      id: true,
      email: true,
      name: true,
      role: true,
      pin: true,
      active: true,
      createdAt: true,
    },
    orderBy: asc(users.name),
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, "user:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const [user] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      pin: parsed.data.pin,
      role: parsed.data.role,
      restaurantId: session.user.restaurantId,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      pin: users.pin,
      active: users.active,
      createdAt: users.createdAt,
    });
  return NextResponse.json(user, { status: 201 });
}
