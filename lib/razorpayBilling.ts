import crypto from "crypto";
import Razorpay from "razorpay";
import { FREE_MONTHLY_CREDITS, PLAN_CREDITS, PLAN_PRICES, STARTER_MONTHLY_CREDITS, type CheckoutPlan } from "@/lib/billing";

const STARTER_SUBSCRIPTION_TOTAL_COUNT = 120;

export type RazorpaySubscriptionEntity = {
  id?: string;
  plan_id?: string;
  status?: string;
  current_start?: number | null;
  current_end?: number | null;
  ended_at?: number | null;
  notes?: Record<string, unknown>;
};

export type RazorpayPaymentEntity = {
  id?: string;
  order_id?: string | null;
  subscription_id?: string | null;
  invoice_id?: string | null;
  amount?: number;
  status?: string;
  notes?: Record<string, unknown>;
};

type SupabaseServiceClient = ReturnType<typeof import("@/lib/supabase").getServiceClient>;

type SyncResult = {
  handled: boolean;
  userId?: string;
  ignored?: boolean;
  reason?: string;
};

function unixToIso(value: number | null | undefined): string | null {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function starterPlanId(): string {
  const planId = process.env.RAZORPAY_STARTER_PLAN_ID;
  if (!planId) throw new Error("RAZORPAY_STARTER_PLAN_ID is required for Starter subscriptions.");
  return planId;
}

export function hasRazorpayBaseConfig(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
}

export function hasStarterSubscriptionConfig(): boolean {
  return hasRazorpayBaseConfig() && !!process.env.RAZORPAY_STARTER_PLAN_ID;
}

export function createRazorpayClient() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export function verifyRazorpaySignature(payload: string, signature: string | undefined | null): boolean {
  if (!signature || !process.env.RAZORPAY_KEY_SECRET) return false;

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);

  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function createStarterSubscription({
  dbUserId,
  providerUserId,
  email,
  name,
}: {
  dbUserId: string;
  providerUserId: string;
  email?: string;
  name?: string;
}) {
  const razorpay = createRazorpayClient();
  const subscription = await razorpay.subscriptions.create({
    plan_id: starterPlanId(),
    total_count: STARTER_SUBSCRIPTION_TOTAL_COUNT,
    quantity: 1,
    customer_notify: true,
    notes: {
      user_id: dbUserId,
      provider_user_id: providerUserId,
      email: email || "",
      name: name || "",
      plan: "starter",
    },
  });

  return subscription as RazorpaySubscriptionEntity;
}

async function findUserIdForSubscription(sb: SupabaseServiceClient, subscription: RazorpaySubscriptionEntity): Promise<string | null> {
  const userIdFromNotes = safeString(subscription.notes?.user_id);
  if (userIdFromNotes) return userIdFromNotes;

  const subscriptionId = safeString(subscription.id);
  if (!subscriptionId) return null;

  const { data: user } = await sb
    .from("users")
    .select("id")
    .eq("razorpay_subscription_id", subscriptionId)
    .maybeSingle();

  return user?.id ?? null;
}

function subscriptionUserFields(subscription: RazorpaySubscriptionEntity, statusOverride?: string) {
  return {
    razorpay_subscription_id: subscription.id ?? null,
    subscription_status: statusOverride ?? subscription.status ?? "unknown",
    subscription_current_start: unixToIso(subscription.current_start),
    subscription_current_end: unixToIso(subscription.current_end),
  };
}

export async function markStarterSubscriptionCreated(
  sb: SupabaseServiceClient,
  userId: string,
  subscription: RazorpaySubscriptionEntity,
): Promise<void> {
  const subscriptionId = safeString(subscription.id);
  if (!subscriptionId) throw new Error("Razorpay subscription id missing.");

  await sb
    .from("users")
    .update(subscriptionUserFields(subscription, subscription.status ?? "created"))
    .eq("id", userId);

  await sb.from("payments").insert({
    user_id: userId,
    razorpay_subscription_id: subscriptionId,
    plan: "starter",
    amount: PLAN_PRICES.starter,
    status: "subscription_created",
    event_type: "subscription.created",
  });
}

async function activateStarterUser(
  sb: SupabaseServiceClient,
  userId: string,
  subscription: RazorpaySubscriptionEntity,
  statusOverride?: string,
): Promise<void> {
  await sb
    .from("users")
    .update({
      ...subscriptionUserFields(subscription, statusOverride),
      plan: "starter",
      credits_remaining: STARTER_MONTHLY_CREDITS,
    })
    .eq("id", userId);
}

async function downgradeStarterUser(
  sb: SupabaseServiceClient,
  userId: string,
  subscription: RazorpaySubscriptionEntity,
  statusOverride?: string,
): Promise<void> {
  await sb
    .from("users")
    .update({
      ...subscriptionUserFields(subscription, statusOverride),
      plan: "free",
      credits_remaining: FREE_MONTHLY_CREDITS,
    })
    .eq("id", userId);
}

async function recordPaymentEvent(
  sb: SupabaseServiceClient,
  {
    userId,
    plan,
    amount,
    status,
    eventType,
    eventId,
    payment,
    subscription,
  }: {
    userId: string;
    plan: CheckoutPlan;
    amount: number;
    status: string;
    eventType: string;
    eventId?: string | null;
    payment?: RazorpayPaymentEntity | null;
    subscription?: RazorpaySubscriptionEntity | null;
  },
): Promise<void> {
  if (eventId) {
    const { data: existingEvent } = await sb
      .from("payments")
      .select("id")
      .eq("razorpay_event_id", eventId)
      .maybeSingle();

    if (existingEvent) return;
  }

  if (payment?.id) {
    const { data: existingPayment } = await sb
      .from("payments")
      .select("id")
      .eq("razorpay_payment_id", payment.id)
      .maybeSingle();

    if (existingPayment) return;
  }

  await sb.from("payments").insert({
    user_id: userId,
    razorpay_order_id: payment?.order_id ?? null,
    razorpay_payment_id: payment?.id ?? null,
    razorpay_subscription_id: subscription?.id ?? payment?.subscription_id ?? null,
    razorpay_invoice_id: payment?.invoice_id ?? null,
    razorpay_event_id: eventId ?? null,
    event_type: eventType,
    plan,
    amount,
    status,
  });
}

function isStarterSubscription(subscription: RazorpaySubscriptionEntity): boolean {
  return subscription.plan_id === starterPlanId();
}

export async function syncStarterSubscriptionEvent({
  sb,
  eventType,
  subscription,
  payment,
  eventId,
}: {
  sb: SupabaseServiceClient;
  eventType: string;
  subscription: RazorpaySubscriptionEntity;
  payment?: RazorpayPaymentEntity | null;
  eventId?: string | null;
}): Promise<SyncResult> {
  const subscriptionId = safeString(subscription.id);
  if (!subscriptionId) return { handled: false, reason: "missing_subscription_id" };
  if (!isStarterSubscription(subscription)) return { handled: true, ignored: true, reason: "non_starter_subscription" };

  const userId = await findUserIdForSubscription(sb, subscription);
  if (!userId) return { handled: false, reason: "unmatched_subscription" };

  if (eventType === "subscription.authenticated") {
    await sb
      .from("users")
      .update(subscriptionUserFields(subscription, "authenticated"))
      .eq("id", userId);

    return { handled: true, userId };
  }

  if (eventType === "subscription.activated" || eventType === "subscription.charged") {
    await activateStarterUser(sb, userId, subscription, subscription.status ?? "active");
    await recordPaymentEvent(sb, {
      userId,
      plan: "starter",
      amount: payment?.amount ?? PLAN_PRICES.starter,
      status: "paid",
      eventType,
      eventId,
      payment,
      subscription,
    });
    return { handled: true, userId };
  }

  if (eventType === "subscription.completed" || eventType === "subscription.cancelled") {
    await downgradeStarterUser(sb, userId, subscription, subscription.status ?? eventType.replace("subscription.", ""));
    await recordPaymentEvent(sb, {
      userId,
      plan: "starter",
      amount: payment?.amount ?? 0,
      status: eventType.replace("subscription.", ""),
      eventType,
      eventId,
      payment,
      subscription,
    });
    return { handled: true, userId };
  }

  return { handled: true, ignored: true, reason: "unsupported_subscription_event" };
}

export async function markSubscriptionPaymentFailed({
  sb,
  subscriptionId,
  payment,
  eventId,
}: {
  sb: SupabaseServiceClient;
  subscriptionId: string;
  payment: RazorpayPaymentEntity;
  eventId?: string | null;
}): Promise<SyncResult> {
  const { data: user } = await sb
    .from("users")
    .select("id, razorpay_subscription_id")
    .eq("razorpay_subscription_id", subscriptionId)
    .maybeSingle();

  if (!user?.id) return { handled: false, reason: "unmatched_subscription" };

  await sb
    .from("users")
    .update({
      subscription_status: "payment_failed",
      plan: "free",
      credits_remaining: FREE_MONTHLY_CREDITS,
    })
    .eq("id", user.id);

  await recordPaymentEvent(sb, {
    userId: user.id,
    plan: "starter",
    amount: payment.amount ?? PLAN_PRICES.starter,
    status: "failed",
    eventType: "payment.failed",
    eventId,
    payment,
    subscription: { id: subscriptionId, status: "payment_failed" },
  });

  return { handled: true, userId: user.id };
}

export async function syncOneTimePaymentCaptured(
  sb: SupabaseServiceClient,
  payment: RazorpayPaymentEntity,
): Promise<SyncResult> {
  const razorpayOrderId = safeString(payment.order_id);
  const razorpayPaymentId = safeString(payment.id);

  if (!razorpayOrderId || !razorpayPaymentId) {
    return { handled: false, reason: "missing_order_payment_id" };
  }

  const { data: dbPayment } = await sb
    .from("payments")
    .select("id, user_id, status, plan")
    .eq("razorpay_order_id", razorpayOrderId)
    .single();

  if (!dbPayment) return { handled: false, reason: "unmatched_order" };
  if (dbPayment.status === "paid") return { handled: true, userId: dbPayment.user_id, reason: "already_paid" };

  await sb
    .from("payments")
    .update({
      razorpay_payment_id: razorpayPaymentId,
      razorpay_invoice_id: payment.invoice_id ?? null,
      status: "paid",
      event_type: "payment.captured",
    })
    .eq("id", dbPayment.id);

  const plan = dbPayment.plan as CheckoutPlan;
  const credits = PLAN_CREDITS[plan];

  if (plan === "credit") {
    const { data: user } = await sb
      .from("users")
      .select("credits_remaining")
      .eq("id", dbPayment.user_id)
      .single();

    await sb
      .from("users")
      .update({ credits_remaining: (user?.credits_remaining ?? 0) + credits })
      .eq("id", dbPayment.user_id);
  } else if (plan === "starter") {
    await sb
      .from("users")
      .update({ plan: "starter", credits_remaining: credits })
      .eq("id", dbPayment.user_id);
  }

  return { handled: true, userId: dbPayment.user_id };
}

export async function markOneTimePaymentFailed(
  sb: SupabaseServiceClient,
  payment: RazorpayPaymentEntity,
): Promise<SyncResult> {
  const razorpayOrderId = safeString(payment.order_id);
  if (!razorpayOrderId) return { handled: false, reason: "missing_order_id" };

  const { data: dbPayment } = await sb
    .from("payments")
    .select("id, user_id")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();

  if (!dbPayment) return { handled: false, reason: "unmatched_order" };

  await sb
    .from("payments")
    .update({
      razorpay_payment_id: payment.id ?? null,
      razorpay_invoice_id: payment.invoice_id ?? null,
      status: "failed",
      event_type: "payment.failed",
    })
    .eq("id", dbPayment.id);

  return { handled: true, userId: dbPayment.user_id };
}
