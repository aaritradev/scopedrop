import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

const protectedPaths = [
  "/dashboard",
  "/generate",
  "/settings",
  "/briefs",
];

const apiProtectedPaths = [
  "/api/generate",
  "/api/briefs",
  "/api/projects",
  "/api/payment/create-order",
  "/api/payment/verify",
];

export default async function middleware(req: NextRequest) {
  const { pathname, search } = new URL(req.url);

  const isProtectedPage = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isProtectedApi = apiProtectedPaths.some((s) => pathname === s || pathname.startsWith(s + "/"));
  const isAuthApi = pathname.startsWith("/api/auth");

  if (isAuthApi) {
    return NextResponse.next();
  }

  const token = req.cookies.get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;

  if (isProtectedPage && !session) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
  }

  if (isProtectedApi && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/generate/:path*",
    "/settings/:path*",
    "/briefs/:path*",
    "/api/generate",
    "/api/briefs/:path*",
    "/api/projects/:path*",
    "/api/payment/create-order",
    "/api/payment/verify",
  ],
};
