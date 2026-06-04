import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import {
  RazorpayPaymentEntity,
  RazorpaySubscriptionEntity,
  createRazorpayClient,
  markOneTimePaymentFailed,
  markSubscriptionPaymentFailed,
  syncOneTimePaymentCaptured,
  syncStarterSubscriptionEvent,
} from "@/lib/razorpayBilling";

export async function POST(req: NextRequest) {
  const ipLimit = checkRateLimit(getClientIp(req), { key: "payment-webhook:ip", limit: 120, windowMs: 60 * 1000 });
  if (ipLimit.limited) {
    return rateLimitResponse(ipLimit.retryAfter);
  }

  const signature = req.headers.get("x-razorpay-signature");
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook signature or secret" }, { status: 400 });
  }

  const rawBody = await req.text();
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signature) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed webhook payload" }, { status: 400 });
  }

  const sb = getServiceClient();
  const eventType = event.event as string | undefined;
  const eventId = req.headers.get("x-razorpay-event-id") ?? event.id ?? null;
  const subscription = event.payload?.subscription?.entity as RazorpaySubscriptionEntity | undefined;
  const payment = event.payload?.payment?.entity as RazorpayPaymentEntity | undefined;

  if (
    eventType === "subscription.authenticated" ||
    eventType === "subscription.activated" ||
    eventType === "subscription.charged" ||
    eventType === "subscription.completed" ||
    eventType === "subscription.cancelled"
  ) {
    if (!subscription) {
      return NextResponse.json({ error: "Malformed subscription webhook payload" }, { status: 400 });
    }

    const result = await syncStarterSubscriptionEvent({
      sb,
      eventType,
      subscription,
      payment: payment ?? null,
      eventId,
    });

    return NextResponse.json({ received: true, ...result });
  }

  if (eventType === "payment.captured") {
    if (!payment) {
      return NextResponse.json({ error: "Malformed payment webhook payload" }, { status: 400 });
    }

    if (payment.subscription_id) {
      try {
        const fetchedSubscription = await createRazorpayClient().subscriptions.fetch(payment.subscription_id);
        const result = await syncStarterSubscriptionEvent({
          sb,
          eventType: "subscription.charged",
          subscription: fetchedSubscription,
          payment,
          eventId,
        });
        return NextResponse.json({ received: true, ...result });
      } catch (error) {
        console.error("Razorpay subscription fetch failed:", error);
        return NextResponse.json({ error: "Subscription sync failed" }, { status: 500 });
      }
    }

    const result = await syncOneTimePaymentCaptured(sb, payment);
    return NextResponse.json({ received: true, ...result });
  }

  if (eventType === "payment.failed") {
    if (!payment) {
      return NextResponse.json({ error: "Malformed payment webhook payload" }, { status: 400 });
    }

    if (payment.subscription_id) {
      const result = await markSubscriptionPaymentFailed({
        sb,
        subscriptionId: payment.subscription_id,
        payment,
        eventId,
      });
      return NextResponse.json({ received: true, ...result });
    }

    const result = await markOneTimePaymentFailed(sb, payment);
    return NextResponse.json({ received: true, ...result });
  }

  return NextResponse.json({ received: true, ignored: true, eventType });
}
