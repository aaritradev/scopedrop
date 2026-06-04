"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import {
  ADDITIONAL_CREDIT,
  PLAN_CONFIG,
  type PlanKey,
  canPurchaseAdditionalCredits,
  getFeatureUpgradeMessage,
  normalizePlan,
} from "@/lib/billing";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

const plans = [PLAN_CONFIG.free, PLAN_CONFIG.starter, PLAN_CONFIG.pro];

interface MeResponse {
  user?: {
    plan?: "free" | "starter" | "pro";
    credits_remaining?: number;
  };
}

function BillingContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [isBusyPlan, setIsBusyPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanKey>("free");
  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
  const canBuyCredits = canPurchaseAdditionalCredits(currentPlan);

  async function refreshPlan() {
    try {
      const res = await fetch("/api/me");
      const data = (await res.json()) as MeResponse;
      setCurrentPlan(normalizePlan(data.user?.plan));
      setCreditsRemaining(data.user?.credits_remaining ?? 0);
    } catch {
      // noop
    }
  }

  useEffect(() => {
    refreshPlan();
  }, []);

  useEffect(() => {
    const planFromQuery = searchParams.get("plan");
    if (planFromQuery === "starter") {
      openCheckout(planFromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function openCheckout(plan: "starter" | "credit") {
    setMessage(null);

    if (plan === "credit" && !canPurchaseAdditionalCredits(currentPlan)) {
      setMessage(getFeatureUpgradeMessage("additionalCreditPurchases"));
      return;
    }

    setIsBusyPlan(plan);

    try {
      const createOrderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const orderData = await createOrderRes.json();
      if (!createOrderRes.ok) {
        setMessage(orderData.error || "Could not start checkout.");
        return;
      }

      if (!window.Razorpay) {
        setMessage("Razorpay checkout is not loaded. Refresh and try again.");
        return;
      }

      const options: Record<string, unknown> = {
        key: orderData.keyId,
        name: "ScopeDrop",
        description: plan === "credit" ? ADDITIONAL_CREDIT.name : "Starter plan",
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        handler: async (response: Record<string, string>) => {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              razorpay_subscription_id: response.razorpay_subscription_id,
              plan,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            setMessage(verifyData.error || "Payment verification failed.");
            return;
          }

          setMessage(
            plan === "credit"
              ? "Payment successful. 1 brief credit added."
              : "Payment successful. Your subscription is being activated.",
          );
          await refreshPlan();
        },
        modal: {
          ondismiss: () => setMessage("Checkout cancelled."),
        },
        theme: { color: "#ff9500" },
      };

      if (orderData.subscriptionId) {
        options.subscription_id = orderData.subscriptionId;
      } else {
        options.amount = orderData.amount;
        options.currency = orderData.currency;
        options.order_id = orderData.orderId;
      }

      new window.Razorpay(options).open();
    } catch {
      setMessage("Something went wrong while opening checkout.");
    } finally {
      setIsBusyPlan(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8">
        <h1 className="text-display-md font-bold text-on-surface">
          Billing
        </h1>
        <p className="mt-1 text-sm text-on-surface/55">
          Current: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} · {currentPlan === "pro" ? "Unlimited briefs" : `${creditsRemaining} briefs remaining`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className="card-base p-6 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-on-surface">
                {plan.name}
              </h3>
              {plan.recommended && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-primary">
                  Recommended
                </span>
              )}
              {plan.comingSoon && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  Launching Soon
                </span>
              )}
            </div>
            <p className="tabular mt-1 text-2xl font-bold text-on-surface">
              {plan.priceLabel}
            </p>
            <p className="text-xs mt-0.5 text-on-surface/55">
              {plan.creditsLabel}
            </p>
            <ul className="mt-4 space-y-2 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="text-xs text-on-surface/55">
                  ✓ {f}
                </li>
              ))}
            </ul>
            {plan.key === "free" ? (
              <button className="btn-primary mt-6 w-full text-xs" disabled={currentPlan !== "free"}>
                {currentPlan === "free" ? "Current Plan" : "Free"}
              </button>
            ) : plan.comingSoon ? (
              <button className="btn-primary mt-6 w-full text-xs disabled:cursor-not-allowed disabled:opacity-50" disabled>
                Coming Soon
              </button>
            ) : (
              <button
                className="btn-primary mt-6 w-full text-xs disabled:opacity-50"
                onClick={() => openCheckout("starter")}
                disabled={isBusyPlan !== null || currentPlan === plan.key}
              >
                {currentPlan === plan.key ? "Current Plan" : isBusyPlan === plan.key ? "Opening..." : "Subscribe"}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="card-base mt-6 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-on-surface">
              Need one extra brief?
            </p>
            <p className="text-xs text-on-surface/55">
              {canBuyCredits
                ? `Buy a single credit for ${ADDITIONAL_CREDIT.priceLabel} without changing your current plan.`
                : getFeatureUpgradeMessage("additionalCreditPurchases")}
            </p>
          </div>
          <button
            className="btn-secondary text-xs"
            onClick={() => (canBuyCredits ? openCheckout("credit") : openCheckout("starter"))}
            disabled={isBusyPlan !== null}
          >
            {canBuyCredits
              ? isBusyPlan === "credit" ? "Opening..." : "Buy 1 Credit"
              : isBusyPlan === "starter" ? "Opening..." : "Subscribe to Starter"}
          </button>
        </div>
      </div>

      {message && (
        <p className="mt-4 text-sm text-on-surface/55">
          {message}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-xs text-on-surface/45">
        <Link href="/privacy" className="transition-colors hover:text-primary">
          Privacy Policy
        </Link>
        <Link href="/terms" className="transition-colors hover:text-primary">
          Terms of Service
        </Link>
      </div>

      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingContent />
    </Suspense>
  );
}
