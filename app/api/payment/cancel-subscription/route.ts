import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifySession } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import {
  createRazorpayClient,
  hasRazorpayBaseConfig,
  markStarterSubscriptionCancellationScheduled,
} from "@/lib/razorpayBilling";

function unixToIso(value?: number | null): string | null {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

export async function POST(req: NextRequest) {
  if (!hasRazorpayBaseConfig()) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  const token = getTokenFromRequest(req);
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userLimit = checkRateLimit(session.sub, { key: "subscription-cancel:user", limit: 6, windowMs: 60 * 60 * 1000 });
  if (userLimit.limited) {
    return rateLimitResponse(userLimit.retryAfter);
  }

  const ipLimit = checkRateLimit(getClientIp(req), { key: "subscription-cancel:ip", limit: 30, windowMs: 60 * 60 * 1000 });
  if (ipLimit.limited) {
    return rateLimitResponse(ipLimit.retryAfter);
  }

  const sb = getServiceClient();
  const { data: user } = await sb
    .from("users")
    .select("id, plan, razorpay_subscription_id, subscription_status, subscription_current_end")
    .eq("provider_user_id", session.sub)
    .single();

  if (!user?.razorpay_subscription_id) {
    return NextResponse.json({ error: "No active subscription found." }, { status: 404 });
  }

  if (user.subscription_status === "cancelled") {
    return NextResponse.json({
      success: true,
      alreadyCancelled: true,
      subscription_status: "cancelled",
      subscription_current_end: user.subscription_current_end ?? null,
    });
  }

  try {
    const razorpay = createRazorpayClient();
    let subscription = await razorpay.subscriptions.cancel(user.razorpay_subscription_id, { cancel_at_cycle_end: 1 });

    if (!subscription?.current_end) {
      subscription = await razorpay.subscriptions.fetch(user.razorpay_subscription_id);
    }

    await markStarterSubscriptionCancellationScheduled(sb, user.id, subscription);

    return NextResponse.json({
      success: true,
      subscription_status: "cancelled",
      subscription_current_end: unixToIso(subscription?.current_end ?? null),
    });
  } catch (error) {
    console.error("Razorpay subscription cancellation failed:", error);
    return NextResponse.json({ error: "Unable to cancel subscription." }, { status: 500 });
  }
}
