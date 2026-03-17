import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth") || pathname.startsWith("/api/seed") || pathname.startsWith("/api/debug")) {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect logged-in users from login to dashboard
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Role-based route protection
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/floor/editor") && !["ADMIN", "MANAGER"].includes(role || "")) {
    return NextResponse.redirect(new URL("/floor", req.url));
  }

  if (pathname.startsWith("/users") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/products") && !["ADMIN", "MANAGER"].includes(role || "")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|api/sse).*)"],
};
