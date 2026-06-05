import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { FREE_MONTHLY_CREDITS } from "@/lib/billing";
import { createRazorpayClient, hasRazorpayBaseConfig, reconcileExpiredStarterAccess } from "@/lib/razorpayBilling";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();

  let { data: user } = await sb
    .from("users")
    .select("id, plan, credits_remaining, subscription_status, subscription_current_start, subscription_current_end, razorpay_subscription_id")
    .eq("provider_user_id", session.sub)
    .single();

  if (!user) {
    const { data: inserted } = await sb
      .from("users")
      .insert({ provider_user_id: session.sub, credits_remaining: FREE_MONTHLY_CREDITS, plan: "free" })
      .select("id, plan, credits_remaining, subscription_status, subscription_current_start, subscription_current_end, razorpay_subscription_id")
      .single();

    return NextResponse.json({ user: inserted ?? { plan: "free", credits_remaining: FREE_MONTHLY_CREDITS } });
  }

  user = await reconcileExpiredStarterAccess(sb, user);

  let subscriptionManageUrl: string | null = null;
  if (hasRazorpayBaseConfig() && user.razorpay_subscription_id && user.plan === "starter") {
    try {
      const subscription = await createRazorpayClient().subscriptions.fetch(user.razorpay_subscription_id);
      subscriptionManageUrl = typeof subscription?.short_url === "string" ? subscription.short_url : null;
    } catch (error) {
      console.error("Razorpay subscription fetch for billing failed:", error);
    }
  }

  return NextResponse.json({
    user: {
      ...user,
      subscription_manage_url: subscriptionManageUrl,
    },
  });
}
