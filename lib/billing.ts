export type PlanKey = "free" | "starter" | "pro";
export type CheckoutPlan = "starter" | "credit";
export type FeatureKey =
  | "generateBrief"
  | "viewGeneratedReport"
  | "discoveryQuestions"
  | "proposalReadinessIntelligence"
  | "copyReportText"
  | "pdfExport"
  | "fullBriefHistory"
  | "priorityProcessing"
  | "additionalCreditPurchases";

export const FREE_MONTHLY_CREDITS = 3;
export const STARTER_MONTHLY_CREDITS = 20;

export const PLAN_CONFIG: Record<PlanKey, {
  key: PlanKey;
  name: string;
  priceLabel: string;
  creditsLabel: string;
  monthlyCredits: number | null;
  historyLimit: number | null;
  purchasable: boolean;
  comingSoon?: boolean;
  recommended?: boolean;
  features: string[];
  entitlements: Record<FeatureKey, boolean>;
}> = {
  free: {
    key: "free",
    name: "Free",
    priceLabel: "₹0",
    creditsLabel: "3 briefs/month",
    monthlyCredits: FREE_MONTHLY_CREDITS,
    historyLimit: FREE_MONTHLY_CREDITS,
    purchasable: false,
    features: [
      "Generate Brief",
      "View Generated Report",
      "Discovery Questions",
      "Proposal Readiness Intelligence",
      "Copy Report Text",
    ],
    entitlements: {
      generateBrief: true,
      viewGeneratedReport: true,
      discoveryQuestions: true,
      proposalReadinessIntelligence: true,
      copyReportText: true,
      pdfExport: false,
      fullBriefHistory: false,
      priorityProcessing: false,
      additionalCreditPurchases: false,
    },
  },
  starter: {
    key: "starter",
    name: "Starter",
    priceLabel: "₹299/mo",
    creditsLabel: "20 briefs/month",
    monthlyCredits: STARTER_MONTHLY_CREDITS,
    historyLimit: null,
    purchasable: true,
    recommended: true,
    features: [
      "Everything in Free",
      "PDF Export",
      "Full Brief History",
      "Priority Processing",
      "Additional Credit Purchases",
    ],
    entitlements: {
      generateBrief: true,
      viewGeneratedReport: true,
      discoveryQuestions: true,
      proposalReadinessIntelligence: true,
      copyReportText: true,
      pdfExport: true,
      fullBriefHistory: true,
      priorityProcessing: true,
      additionalCreditPurchases: true,
    },
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceLabel: "₹799/mo",
    creditsLabel: "Unlimited briefs",
    monthlyCredits: null,
    historyLimit: null,
    purchasable: false,
    comingSoon: true,
    features: [
      "Everything in Starter",
      "White-label PDF export",
      "Proposal generation",
      "Client-ready documents",
      "Faster AI generation",
    ],
    entitlements: {
      generateBrief: true,
      viewGeneratedReport: true,
      discoveryQuestions: true,
      proposalReadinessIntelligence: true,
      copyReportText: true,
      pdfExport: true,
      fullBriefHistory: true,
      priorityProcessing: true,
      additionalCreditPurchases: false,
    },
  },
};

export const ADDITIONAL_CREDIT = {
  key: "credit",
  name: "Single brief credit",
  priceLabel: "₹39",
  priceInPaise: 3900,
  credits: 1,
  eligiblePlan: "starter" as const,
};

export const PLAN_PRICES: Record<CheckoutPlan, number> = {
  starter: 29900,
  credit: ADDITIONAL_CREDIT.priceInPaise,
};

export const PLAN_CREDITS: Record<CheckoutPlan, number> = {
  starter: STARTER_MONTHLY_CREDITS,
  credit: ADDITIONAL_CREDIT.credits,
};

export type PaidPlan = CheckoutPlan;

export function normalizePlan(value: string | null | undefined): PlanKey {
  return value === "starter" || value === "pro" ? value : "free";
}

export function isPaidPlan(value: string): value is PaidPlan {
  return value === "starter" || value === "credit";
}

export function canUseFeature(plan: string | null | undefined, feature: FeatureKey): boolean {
  return PLAN_CONFIG[normalizePlan(plan)].entitlements[feature];
}

export function canPurchaseAdditionalCredits(plan: string | null | undefined): boolean {
  return canUseFeature(plan, "additionalCreditPurchases");
}

export function getBriefHistoryLimit(plan: string | null | undefined): number | null {
  return PLAN_CONFIG[normalizePlan(plan)].historyLimit;
}

export function getInitialCredits(plan: PlanKey): number {
  return PLAN_CONFIG[plan].monthlyCredits ?? STARTER_MONTHLY_CREDITS;
}

export function getFeatureUpgradeMessage(feature: FeatureKey): string {
  if (feature === "additionalCreditPurchases") {
    return "Upgrade to Starter to purchase additional credits.";
  }

  if (feature === "pdfExport") {
    return "PDF export is included in Starter.";
  }

  if (feature === "fullBriefHistory") {
    return "Full brief history is included in Starter.";
  }

  return "Upgrade to Starter to use this feature.";
}
