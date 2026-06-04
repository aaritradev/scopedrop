import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { verifySession, getTokenFromRequest } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { FREE_MONTHLY_CREDITS, PLAN_PRICES, canPurchaseAdditionalCredits, isPaidPlan } from "@/lib/billing";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import {
  createStarterSubscription,
  hasRazorpayBaseConfig,
  hasStarterSubscriptionConfig,
  markStarterSubscriptionCreated,
} from "@/lib/razorpayBilling";

export async function POST(req: NextRequest) {
  if (!hasRazorpayBaseConfig()) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  const token = getTokenFromRequest(req);
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userLimit = checkRateLimit(session.sub, { key: "checkout:user", limit: 10, windowMs: 15 * 60 * 1000 });
  if (userLimit.limited) {
    return rateLimitResponse(userLimit.retryAfter);
  }

  const ipLimit = checkRateLimit(getClientIp(req), { key: "checkout:ip", limit: 30, windowMs: 15 * 60 * 1000 });
  if (ipLimit.limited) {
    return rateLimitResponse(ipLimit.retryAfter);
  }

  const { plan } = await req.json();

  if (plan === "pro") {
    return NextResponse.json({ error: "Pro is launching soon." }, { status: 400 });
  }

  if (!plan || !isPaidPlan(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const sb = getServiceClient();
    const { data: existingUser } = await sb
      .from("users")
      .select("id, plan")
      .eq("provider_user_id", session.sub)
      .single();

    const dbUser = existingUser?.id
      ? existingUser
      : (
        await sb
          .from("users")
          .insert({ provider_user_id: session.sub, credits_remaining: FREE_MONTHLY_CREDITS, plan: "free" })
          .select("id, plan")
          .single()
      ).data;

    const dbUserId = dbUser?.id;

    if (!dbUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (plan === "credit" && !canPurchaseAdditionalCredits(dbUser.plan)) {
      return NextResponse.json({ error: "Upgrade to Starter to purchase additional credits." }, { status: 403 });
    }

    if (plan === "starter") {
      if (!hasStarterSubscriptionConfig()) {
        return NextResponse.json({ error: "Starter subscriptions are not configured yet." }, { status: 503 });
      }

      const subscription = await createStarterSubscription({
        dbUserId,
        providerUserId: session.sub,
        email: session.email,
        name: session.name,
      });

      await markStarterSubscriptionCreated(sb, dbUserId, subscription);

      return NextResponse.json({
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      });
    }

    const order = await razorpay.orders.create({
      amount: PLAN_PRICES[plan],
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { provider_user_id: session.sub, user_id: dbUserId, plan },
    });

    await sb.from("payments").insert({
      user_id: dbUserId,
      razorpay_order_id: order.id,
      plan,
      amount: order.amount,
      status: "created",
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay create order error:", error);
    return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
  }
}
