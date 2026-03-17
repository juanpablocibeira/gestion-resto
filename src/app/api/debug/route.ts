import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const steps: Record<string, unknown> = {};

  // 1. Env vars
  steps["1_env"] = {
    DATABASE_URL: process.env.DATABASE_URL ? "SET (" + process.env.DATABASE_URL.substring(0, 40) + "...)" : "NOT SET",
    AUTH_SECRET: process.env.AUTH_SECRET ? "SET (" + process.env.AUTH_SECRET.length + " chars)" : "NOT SET",
    AUTH_URL: process.env.AUTH_URL ?? "NOT SET",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
  };

  // 2. DB connection + user lookup
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, "admin@resto.com"),
    });
    steps["2_db_user"] = user
      ? {
          found: true,
          id: user.id,
          email: user.email,
          role: user.role,
          active: user.active,
          hashPrefix: user.passwordHash.substring(0, 15),
        }
      : { found: false };
  } catch (e) {
    steps["2_db_user"] = { error: String(e) };
  }

  // 3. Password verification
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, "admin@resto.com"),
    });
    if (user) {
      const valid = await bcrypt.compare("admin123", user.passwordHash);
      steps["3_password"] = { valid };
    }
  } catch (e) {
    steps["3_password"] = { error: String(e) };
  }

  // 4. Current session (from request cookies)
  try {
    const session = await auth();
    steps["4_session"] = session
      ? { authenticated: true, user: session.user }
      : { authenticated: false };
  } catch (e) {
    steps["4_session"] = { error: String(e) };
  }

  // 5. Cookies present
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    steps["5_cookies"] = allCookies.map((c) => ({
      name: c.name,
      valueLength: c.value.length,
    }));
  } catch (e) {
    steps["5_cookies"] = { error: String(e) };
  }

  // 6. Request headers (relevant ones)
  steps["6_headers"] = {
    host: req.headers.get("host"),
    origin: req.headers.get("origin"),
    referer: req.headers.get("referer"),
    "x-forwarded-proto": req.headers.get("x-forwarded-proto"),
    "x-forwarded-host": req.headers.get("x-forwarded-host"),
  };

  return NextResponse.json(steps, { status: 200 });
}
