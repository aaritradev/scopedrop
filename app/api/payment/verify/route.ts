import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifySession, getTokenFromRequest } from "@/lib/auth";
import { PLAN_CREDITS, PLAN_PRICES, isPaidPlan } from "@/lib/billing";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { createRazorpayClient, syncStarterSubscriptionEvent, verifyRazorpaySignature } from "@/lib/razorpayBilling";

export async function POST(req: NextRequest) {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  const token = getTokenFromRequest(req);
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userLimit = checkRateLimit(session.sub, { key: "payment-verify:user", limit: 20, windowMs: 15 * 60 * 1000 });
  if (userLimit.limited) {
    return rateLimitResponse(userLimit.retryAfter);
  }

  const ipLimit = checkRateLimit(getClientIp(req), { key: "payment-verify:ip", limit: 60, windowMs: 15 * 60 * 1000 });
  if (ipLimit.limited) {
    return rateLimitResponse(ipLimit.retryAfter);
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    razorpay_subscription_id,
    plan,
  } = await req.json();

  const isSubscriptionCheckout = plan === "starter" && razorpay_subscription_id;
  const body = isSubscriptionCheckout
    ? `${razorpay_payment_id}|${razorpay_subscription_id}`
    : `${razorpay_order_id}|${razorpay_payment_id}`;

  if (!verifyRazorpaySignature(body, razorpay_signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!isPaidPlan(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const sb = getServiceClient();

  const { data: user } = await sb
    .from("users")
    .select("id")
    .eq("provider_user_id", session.sub)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (isSubscriptionCheckout) {
    const { data: subscriptionOwner } = await sb
      .from("users")
      .select("id, razorpay_subscription_id")
      .eq("id", user.id)
      .eq("razorpay_subscription_id", razorpay_subscription_id)
      .single();

    if (!subscriptionOwner) {
      return NextResponse.json({ error: "Subscription mismatch" }, { status: 403 });
    }

    await sb
      .from("payments")
      .update({
        razorpay_payment_id,
        status: "authenticated",
        event_type: "checkout.subscription_authenticated",
      })
      .eq("user_id", user.id)
      .eq("razorpay_subscription_id", razorpay_subscription_id)
      .eq("status", "subscription_created");

    await sb
      .from("users")
      .update({ subscription_status: "authenticated" })
      .eq("id", user.id)
      .eq("razorpay_subscription_id", razorpay_subscription_id);

    try {
      const subscription = await createRazorpayClient().subscriptions.fetch(razorpay_subscription_id);
      if (subscription?.status === "active") {
        await syncStarterSubscriptionEvent({
          sb,
          eventType: "subscription.activated",
          subscription,
          payment: { id: razorpay_payment_id, subscription_id: razorpay_subscription_id, amount: PLAN_PRICES.starter },
        });
      }
    } catch (error) {
      console.error("Razorpay subscription post-verify sync failed:", error);
    }

    return NextResponse.json({ success: true, pendingWebhook: true });
  }

  const { data: existingPayment } = await sb
    .from("payments")
    .select("id, user_id, status, plan")
    .eq("razorpay_order_id", razorpay_order_id)
    .single();

  if (!existingPayment || existingPayment.user_id !== user.id) {
    return NextResponse.json({ error: "Payment order mismatch" }, { status: 403 });
  }

  if (existingPayment.status === "paid") {
    return NextResponse.json({ success: true, alreadyProcessed: true });
  }

  if (existingPayment.plan !== plan) {
    return NextResponse.json({ error: "Plan mismatch" }, { status: 400 });
  }

  const amount = PLAN_PRICES[plan];

  await sb
    .from("payments")
    .update({
      razorpay_payment_id,
      plan,
      amount,
      status: "paid",
    })
    .eq("id", existingPayment.id);

  const newCredits = PLAN_CREDITS[plan];

  if (plan === "credit") {
    const { data: currentUser } = await sb
      .from("users")
      .select("credits_remaining")
      .eq("id", user.id)
      .single();

    const currentCredits = currentUser?.credits_remaining ?? 0;

    await sb
      .from("users")
      .update({
        credits_remaining: currentCredits + newCredits,
      })
      .eq("id", user.id);
  } else {
    await sb
      .from("users")
      .update({
        plan,
        credits_remaining: newCredits,
      })
      .eq("id", user.id);
  }

  return NextResponse.json({ success: true });
}
