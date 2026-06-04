import { NextResponse } from "next/server";

const COOKIE_NAME = "session";

function getSessionSecret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error("SESSION_SECRET is required.");
  }

  if (value.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }

  if (process.env.NODE_ENV === "production" && /fallback|change|placeholder|your_|dev-session/i.test(value)) {
    throw new Error("SESSION_SECRET must be a strong production secret.");
  }

  return value;
}

const secretBytes = new TextEncoder().encode(getSessionSecret());

function toArrayBuffer(ui8: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(ui8.length);
  new Uint8Array(buf).set(ui8);
  return buf;
}

function importKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    toArrayBuffer(secretBytes),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

function toBase64Url(buf: ArrayBuffer): string {
  const view = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const bin = atob(padded);
  const buf = new ArrayBuffer(bin.length);
  new Uint8Array(buf).forEach((_, i, a) => { a[i] = bin.charCodeAt(i); });
  return buf;
}

function encodeStr(s: string): ArrayBuffer {
  return toArrayBuffer(new TextEncoder().encode(s));
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const header = toBase64Url(encodeStr(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const now = Math.floor(Date.now() / 1000);
  const body = toBase64Url(
    encodeStr(
      JSON.stringify({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        iat: now,
        exp: now + 60 * 60 * 24 * 30,
      }),
    ),
  );

  const key = await importKey("sign");
  const sig = await crypto.subtle.sign("HMAC", key, encodeStr(`${header}.${body}`));

  return `${header}.${body}.${toBase64Url(sig)}`;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[1])));
    const exp = payload.exp;
    if (exp && Date.now() / 1000 > exp) return null;

    const key = await importKey("verify");
    const sig = fromBase64Url(parts[2]);
    const valid = await crypto.subtle.verify("HMAC", key, sig, encodeStr(`${parts[0]}.${parts[1]}`));
    if (!valid) return null;

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    return null;
  }
}

export function makeCookieValue(token: string): string {
  const secure = process.env.NODE_ENV === "production";
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function makeClearCookieValue(): string {
  const secure = process.env.NODE_ENV === "production";
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.headers.append("Set-Cookie", makeCookieValue(token));
}

export function clearSessionCookie(response: NextResponse) {
  response.headers.append("Set-Cookie", makeClearCookieValue());
}

export function getTokenFromRequest(req: import("next/server").NextRequest): string | null {
  return req.cookies.get(COOKIE_NAME)?.value ?? null;
}
