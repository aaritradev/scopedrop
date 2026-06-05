import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifySession } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { createRazorpayClient, hasRazorpayBaseConfig } from "@/lib/razorpayBilling";

export async function POST(req: NextRequest) {
  if (!hasRazorpayBaseConfig()) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  const token = getTokenFromRequest(req);
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userLimit = checkRateLimit(session.sub, { key: "subscription-manage:user", limit: 20, windowMs: 60 * 60 * 1000 });
  if (userLimit.limited) {
    return rateLimitResponse(userLimit.retryAfter);
  }

  const ipLimit = checkRateLimit(getClientIp(req), { key: "subscription-manage:ip", limit: 60, windowMs: 60 * 60 * 1000 });
  if (ipLimit.limited) {
    return rateLimitResponse(ipLimit.retryAfter);
  }

  const sb = getServiceClient();
  const { data: user } = await sb
    .from("users")
    .select("id, razorpay_subscription_id")
    .eq("provider_user_id", session.sub)
    .single();

  if (!user?.razorpay_subscription_id) {
    return NextResponse.json({ error: "No active subscription found." }, { status: 404 });
  }

  try {
    const subscription = await createRazorpayClient().subscriptions.fetch(user.razorpay_subscription_id);
    const shortUrl = typeof subscription?.short_url === "string" ? subscription.short_url : null;

    if (!shortUrl) {
      return NextResponse.json({ error: "Subscription portal is not available." }, { status: 404 });
    }

    return NextResponse.json({ url: shortUrl });
  } catch (error) {
    console.error("Razorpay subscription fetch failed:", error);
    return NextResponse.json({ error: "Unable to open subscription portal." }, { status: 500 });
  }
}
