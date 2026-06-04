import { NextRequest, NextResponse } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { FREE_MONTHLY_CREDITS } from "@/lib/billing";

const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_REDIRECT_COOKIE = "oauth_redirect";

function clearOAuthCookie(name: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

function clearOAuthCookies(response: NextResponse) {
  response.headers.append("Set-Cookie", clearOAuthCookie(OAUTH_STATE_COOKIE));
  response.headers.append("Set-Cookie", clearOAuthCookie(OAUTH_REDIRECT_COOKIE));
}

function safeRedirectPath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }

  return value;
}

function signInErrorRedirect(req: NextRequest, error: string) {
  const url = new URL("/sign-in", req.url);
  url.searchParams.set("error", error);

  const requestedRedirect = safeRedirectPath(req.cookies.get(OAUTH_REDIRECT_COOKIE)?.value);
  if (requestedRedirect !== "/dashboard") {
    url.searchParams.set("redirect_url", requestedRedirect);
  }

  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (error || !code) {
    const response = signInErrorRedirect(req, "oauth_denied");
    clearOAuthCookies(response);
    return response;
  }

  if (!state || !expectedState || state !== expectedState) {
    const response = signInErrorRedirect(req, "oauth_state");
    clearOAuthCookies(response);
    return response;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const response = signInErrorRedirect(req, "misconfigured");
    clearOAuthCookies(response);
    return response;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/auth/google/callback`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok || !tokens.id_token) {
    console.error("Token exchange failed:", tokens);
    const response = signInErrorRedirect(req, "token_exchange");
    clearOAuthCookies(response);
    return response;
  }

  const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const userInfo = await userInfoResponse.json();
  if (!userInfo.sub || !userInfo.email) {
    const response = signInErrorRedirect(req, "userinfo");
    clearOAuthCookies(response);
    return response;
  }

  const sb = getServiceClient();

  const { data: existing } = await sb
    .from("users")
    .select("id, plan, credits_remaining")
    .eq("provider_user_id", userInfo.sub)
    .single();

  if (!existing) {
    const { error: insertError } = await sb.from("users").upsert(
      {
        provider_user_id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split("@")[0],
        avatar_url: userInfo.picture || null,
        credits_remaining: FREE_MONTHLY_CREDITS,
        plan: "free",
      },
      { onConflict: "provider_user_id" },
    );
    if (insertError) {
      console.error("User upsert failed:", insertError);
    }
  }

  const session = await createSession({
    sub: userInfo.sub,
    email: userInfo.email,
    name: userInfo.name || userInfo.email.split("@")[0],
    picture: userInfo.picture || "",
  });

  const requestedRedirect = safeRedirectPath(req.cookies.get(OAUTH_REDIRECT_COOKIE)?.value);

  const response = NextResponse.redirect(
    new URL(requestedRedirect.startsWith("/") ? requestedRedirect : "/dashboard", req.url),
  );
  setSessionCookie(response, session);
  clearOAuthCookies(response);
  return response;
}
