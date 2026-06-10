export type PlanKey = "free" | "starter" | "pro";
export type CheckoutPlan = "starter" | "pro" | "credit";
export type FeatureKey =
  | "generateBrief"
  | "viewGeneratedReport"
  | "discoveryQuestions"
  | "proposalReadinessIntelligence"
  | "copyReportText"
  | "pdfExport"
  | "fullBriefHistory"
  | "priorityProcessing"
  | "additionalCreditPurchases"
  | "clientPortal"
  | "fileSharing"
  | "invoicing"
  | "customBranding"
  | "invoiceReminders";

export const FREE_MONTHLY_CREDITS = 3;
export const STARTER_MONTHLY_CREDITS = null; // unlimited

export const PLAN_CONFIG: Record<PlanKey, {
  key: PlanKey;
  name: string;
  priceINR: number;         // in paise
  priceUSD: number;         // in cents
  priceINRLabel: string;
  priceUSDLabel: string;
  /** @deprecated use priceINRLabel or priceUSDLabel */
  priceLabel: string;
  creditsLabel: string;
  monthlyCredits: number | null;
  historyLimit: number | null;
  activeProjectsLimit: number | null; // null = unlimited
  purchasable: boolean;
  comingSoon?: boolean;
  recommended?: boolean;
  features: string[];
  entitlements: Record<FeatureKey, boolean>;
}> = {
  free: {
    key: "free",
    name: "Free",
    priceINR: 0,
    priceUSD: 0,
    priceINRLabel: "₹0",
    priceUSDLabel: "$0",
    priceLabel: "₹0",
    creditsLabel: "3 scopes/month",
    monthlyCredits: FREE_MONTHLY_CREDITS,
    historyLimit: FREE_MONTHLY_CREDITS,
    activeProjectsLimit: 0,
    purchasable: false,
    features: [
      "Scope generator (3/month)",
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
      clientPortal: false,
      fileSharing: false,
      invoicing: false,
      customBranding: false,
      invoiceReminders: false,
    },
  },
  starter: {
    key: "starter",
    name: "Starter",
    priceINR: 49900,
    priceUSD: 599,
    priceINRLabel: "₹499/mo",
    priceUSDLabel: "$5.99/mo",
    priceLabel: "₹499/mo",
    creditsLabel: "Unlimited scopes",
    monthlyCredits: null,
    historyLimit: null,
    activeProjectsLimit: 5,
    purchasable: true,
    recommended: true,
    features: [
      "Everything in Free",
      "Unlimited scopes",
      "Client portal",
      "File sharing",
      "Invoice + payment details",
      "5 active projects",
      "PDF Export",
      "Full Brief History",
      "Priority Processing",
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
      clientPortal: true,
      fileSharing: true,
      invoicing: true,
      customBranding: false,
      invoiceReminders: false,
    },
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceINR: 99900,
    priceUSD: 1199,
    priceINRLabel: "₹999/mo",
    priceUSDLabel: "$11.99/mo",
    priceLabel: "₹999/mo",
    creditsLabel: "Unlimited everything",
    monthlyCredits: null,
    historyLimit: null,
    activeProjectsLimit: null,
    purchasable: true,
    features: [
      "Everything in Starter",
      "Unlimited projects",
      "Custom branding on portal",
      "Invoice reminders",
      "White-label PDF export",
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
      clientPortal: true,
      fileSharing: true,
      invoicing: true,
      customBranding: true,
      invoiceReminders: true,
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

export const PLAN_PRICES_INR: Record<string, number> = {
  starter: 49900,
  pro: 99900,
  credit: ADDITIONAL_CREDIT.priceInPaise,
};

export const PLAN_PRICES_USD: Record<string, number> = {
  starter: 599,
  pro: 1199,
};

/** @deprecated use PLAN_PRICES_INR */
export const PLAN_PRICES: Record<CheckoutPlan, number> = {
  starter: 49900,
  pro: 99900,
  credit: ADDITIONAL_CREDIT.priceInPaise,
};

export const PLAN_CREDITS: Record<CheckoutPlan, number | null> = {
  starter: null,
  pro: null,
  credit: ADDITIONAL_CREDIT.credits,
};

export type PaidPlan = CheckoutPlan;

export function normalizePlan(value: string | null | undefined): PlanKey {
  return value === "starter" || value === "pro" ? value : "free";
}

export function isPaidPlan(value: string): value is PaidPlan {
  return value === "starter" || value === "pro" || value === "credit";
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

export function getActiveProjectsLimit(plan: string | null | undefined): number | null {
  return PLAN_CONFIG[normalizePlan(plan)].activeProjectsLimit;
}

export function canCreateProject(plan: string | null | undefined, currentProjectCount: number): boolean {
  const limit = getActiveProjectsLimit(plan);
  if (!canUseFeature(plan, "clientPortal")) return false;
  if (limit === null) return true;
  return currentProjectCount < limit;
}

export function getInitialCredits(plan: PlanKey): number {
  return PLAN_CONFIG[plan].monthlyCredits ?? FREE_MONTHLY_CREDITS;
}

export function getFeatureUpgradeMessage(feature: FeatureKey): string {
  switch (feature) {
    case "additionalCreditPurchases":
      return "Upgrade to Starter to purchase additional credits.";
    case "pdfExport":
      return "PDF export is included in Starter.";
    case "fullBriefHistory":
      return "Full brief history is included in Starter.";
    case "clientPortal":
      return "Upgrade to Starter (₹499/mo) to create a client portal.";
    case "fileSharing":
      return "File sharing is included in Starter.";
    case "invoicing":
      return "Invoicing is included in Starter.";
    case "customBranding":
      return "Custom branding is a Pro feature.";
    case "invoiceReminders":
      return "Invoice reminders are a Pro feature.";
    default:
      return "Upgrade to Starter to use this feature.";
  }
}
