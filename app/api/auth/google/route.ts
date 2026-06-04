import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_REDIRECT_COOKIE = "oauth_redirect";

function serializeOAuthCookie(name: string, value: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function safeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }

  return value;
}

export async function GET(req: NextRequest) {
  const ipLimit = checkRateLimit(getClientIp(req), { key: "oauth-google:ip", limit: 30, windowMs: 10 * 60 * 1000 });
  if (ipLimit.limited) {
    return rateLimitResponse(ipLimit.retryAfter);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 503 });
  }

  const nonce = crypto.randomUUID();
  const requestedRedirect = safeRedirectPath(req.nextUrl.searchParams.get("state"));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state: nonce,
  });

  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  response.headers.append("Set-Cookie", serializeOAuthCookie(OAUTH_STATE_COOKIE, nonce, 600));
  response.headers.append("Set-Cookie", serializeOAuthCookie(OAUTH_REDIRECT_COOKIE, requestedRedirect, 600));
  return response;
}
