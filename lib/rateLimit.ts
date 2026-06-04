import { NextRequest, NextResponse } from "next/server";

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const globalStore = globalThis as typeof globalThis & {
  __scopeDropRateLimitStore?: Map<string, RateLimitEntry>;
};

const store = globalStore.__scopeDropRateLimitStore ?? new Map<string, RateLimitEntry>();
globalStore.__scopeDropRateLimitStore = store;

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || req.headers.get("x-real-ip") || "unknown";
}

export function checkRateLimit(identifier: string, options: RateLimitOptions) {
  const now = Date.now();
  const key = `${options.key}:${identifier}`;
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { limited: false, retryAfter: 0 };
  }

  existing.count += 1;

  if (existing.count > options.limit) {
    return {
      limited: true,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { limited: false, retryAfter: 0 };
}

export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    },
  );
}
