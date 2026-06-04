// ScopeDrop Extraction Pipeline Test
// Tests pure extraction logic against a CrewLink-style input
// Run: node test/extraction-test.mjs

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Types (inline, matching types/brief.ts) ────────────────────────────────

/** @typedef {"CRITICAL"|"IMPORTANT"|"OPTIONAL"} Priority */
/** @typedef {"low"|"medium"|"high"} RiskSeverity */
/** @typedef {"Low"|"Medium"|"High"|"Very High"} Complexity */
/** @typedef {"Low"|"Medium"|"High"} RiskLevel */
/** @typedef {"High"|"Medium"|"Low"} PricingConfidenceLevel */
/** @typedef {"Accept"|"Accept with Conditions"|"Discovery Call Required"|"Renegotiate Scope"|"Decline"} RecommendedAction */

/**
 * @typedef {{ field: string; status: "ok"|"missing"|"partial"; message: string }} ExtractionWarning
 * @typedef {{ name: string; description: string; format: string; duePhase: string }} Deliverable
 * @typedef {{ milestone: string; description: string; estimatedDays: number }} TimelineMilestone
 * @typedef {{ estimatedBudget: string; deposit: string; milestonePayments: string[]; finalPayment: string }} PaymentTerms
 * @typedef {{ question: string; context: string; priority?: Priority }} DiscoveryQuestion
 * @typedef {{ risk: string; severity: RiskSeverity; mitigation: string; priority?: Priority }} Risk
 * @typedef {{ warning: string; why: string }} ScopeCreepWarning
 * @typedef {{ service: string; rationale: string }} UpsellOpportunity
 * @typedef {{ complexity: Complexity; breakdown: string[] }} EffortAnalysis
 * @typedef {{ isValid: boolean; warnings: string[] }} NumericalValidation
 * @typedef {{ estimatedMarketCost: string; clientBudget: string; gap: string; recommendation: string }} BudgetRealityCheck
 * @typedef {{ name: string; items: string[] }} ProposalPhase
 * @typedef {{ score: number; missing: string[] }} ReadinessCategory
 * @typedef {{ requirements: ReadinessCategory; technical: ReadinessCategory; business: ReadinessCategory; budget: ReadinessCategory; overallReadiness: number; explanation: string }} ProposalReadinessBreakdown
 * @typedef {{ level: RiskLevel; explanation: string }} ClientRiskScore
 * @typedef {{ requirement: string; priority: Priority }} MissingRequirement
 * @typedef {{ suggestedFixedPrice: string; suggestedHourlyEquivalent: string; suggestedMVPPrice: string; suggestedRetainerOpportunity: string; confidence: PricingConfidenceLevel; confidenceReason: string }} PricingGuidance
 * @typedef {{ score: number; pros: string[]; cons: string[]; explanation: string }} ProfitabilityScore
 * @typedef {{ recommendedPosition: string; avoid: string; talkingPoints: string[] }} NegotiationStrategy
 * @typedef {{ type: string; buyingBehavior: string; riskProfile: string; decisionSpeed: string; scopeChangeLikelihood: string }} ClientTypeClassification
 * @typedef {{ level: RiskLevel; factors: string[]; explanation: string }} ProjectFailureRisk
 * @typedef {{ action: RecommendedAction; reasoning: string }} ProjectDecision
 */

/**
 * @typedef {{
 *   projectTitle: string; clientName: string; projectSummary: string; executiveSummary: string;
 *   objectives: string[]; scopeIncluded: string[]; scopeExcluded: string[]; assumptions: string[];
 *   deliverables: Deliverable[]; timeline: TimelineMilestone[]; paymentTerms: PaymentTerms;
 *   nextSteps: string[]; redFlags: string[]; confidenceScore: number; confidenceReason?: string;
 *   discoveryQuestions: DiscoveryQuestion[]; risks: Risk[]; scopeCreepWarnings: ScopeCreepWarning[];
 *   missingRequirements: MissingRequirement[]; upsellOpportunities: UpsellOpportunity[];
 *   effortAnalysis: EffortAnalysis; proposalReadinessBreakdown: ProposalReadinessBreakdown;
 *   numericalValidation: NumericalValidation; budgetRealityCheck: BudgetRealityCheck;
 *   proposalStrategy: ProposalPhase[]; dealKillers: string[]; clientRiskScore: ClientRiskScore;
 *   pricingGuidance: PricingGuidance; profitabilityScore: ProfitabilityScore;
 *   negotiationStrategy: NegotiationStrategy; clientTypeClassification: ClientTypeClassification;
 *   projectFailureRisk: ProjectFailureRisk; projectDecision: ProjectDecision;
 *   clientResponseDraft: string; extractionWarnings?: ExtractionWarning[];
 * }} GeneratedBrief
 */

// ─── Pure Extraction Functions (from lib/generateBrief.ts) ───────────────────

let parserLog = [];
function log(stage, message, data) {
  const entry = { stage, message, ts: Date.now(), data };
  parserLog.push(entry);
}
function resetLog() { parserLog = []; }

function isFieldPresent(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v !== "" && v !== "unknown" && v !== "not specified" && v !== "requires clarification" && v !== "to be determined" && v !== "to be discussed" && v !== "not applicable" && v !== "cannot estimate" && v !== "cannot calculate";
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object" && value !== null) return Object.keys(value).length > 0;
  if (typeof value === "number") return true;
  return false;
}

function extractBudget(rawInput) {
  const text = rawInput.toLowerCase();
  const patterns = [
    /(?:budget|spend|cost|price)\s*(?:is|:)?\s*(?:around|approx|about|rs\.?|inr|usd|\$|₹)?\s*([\d,]+(?:\.\d+)?(?:\s*(?:lakh|crore|k|million|thousand))?)/i,
    /(?:₹\s*([\d,]+(?:\.\d+)?(?:\s*(?:lakh|crore|k|million))?))/i,
    /(?:budget|spend|cost)\s*(?:of|:)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?(?:\s*(?:lakh|crore))?)/i,
    /\b(\d+)\s*(lakh|crore)\b/i,
    /₹\s*([\d,]+)\s*(lakh|crore|k|million)?/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return m[0].trim();
  }
  return "Not Specified";
}

function extractTimeline(rawInput) {
  const text = rawInput.toLowerCase();
  const patterns = [
    /(?:timeline|deadline)\s*(?:is|:)?\s*(\d+\s*(?:week|month|day|year)s?)/i,
    /(\d+\s*(?:week|month|day|year)s?)\s*(?:timeline|deadline)/i,
    /(?:deliver|launch|complete)\s*(?:by|in|within|of)?\s*(\d+\s*(?:week|month|day|year)s?)/i,
    /\b(\d+)\s*(month|week)\s/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return m[0].trim();
  }
  return "Not Specified";
}

function extractFinanceValue(rawInput) {
  const budget = extractBudget(rawInput);
  if (budget !== "Not Specified") return budget;
  return "Not Specified";
}

function extractProjectType(rawInput) {
  const text = rawInput.toLowerCase();
  if (/(?:event|photographer|videographer|dj|makeup|catering|temporary|gig|freelance)\b/i.test(text)) return "Event Staffing Platform";
  if (/(?:ecommerce|e-commerce|shop|store|product|cart|checkout)/i.test(text)) return "E-commerce";
  if (/(?:hotel|booking|ota|travel|accommodation|reservation)/i.test(text)) return "Hotel / Travel";
  if (/(?:mobile|app|ios|android|swift|kotlin|flutter|react native)/i.test(text)) return "Mobile App";
  if (/(?:saas|subscription|platform|multi-tenant|billing)/i.test(text)) return "SaaS";
  if (/(?:website|landing|brochure|cms|wordpress)/i.test(text)) return "Website";
  if (/(?:dashboard|analytics|data|reporting)/i.test(text)) return "Dashboard / Analytics";
  if (/(?:api|integration|backend|microservice)/i.test(text)) return "API / Backend";
  if (/(?:healthcare|hipaa|ehr|emr|patient|clinic|hospital)/i.test(text)) return "Healthcare";
  if (/(?:ai|ml|chatbot|gpt|llm|machine learning)/i.test(text)) return "AI / ML";
  return "Unknown";
}

function extractCountries(rawInput) {
  const text = rawInput.toLowerCase();
  const result = [];
  if (/\b(?:india|indian)\b/i.test(text)) result.push("India");
  if (/\b(?:uae|dubai|emirates|united arab emirates)\b/i.test(text)) result.push("UAE");
  if (/\b(?:uk|united kingdom|britain|england)\b/i.test(text)) result.push("UK");
  if (/\b(?:usa|united states|america|us)\b/i.test(text)) result.push("USA");
  return result;
}

function detectFeatures(rawInput) {
  const text = rawInput.toLowerCase();
  const features = [
    { keyword: /(?:profile|portfolio|verification)/i, feature: "User profile and verification management" },
    { keyword: /(?:gig|job|task|delivery.request|assignment)\b/i, feature: "Task and delivery management" },
    { keyword: /(?:payment|stripe|razorpay|invoice|billing)/i, feature: "Payment and billing processing" },
    { keyword: /(?:review|rating|feedback)/i, feature: "Review and feedback system" },
    { keyword: /(?:chat|messaging|message|whatsapp)/i, feature: "Messaging and communication" },
    { keyword: /(?:earnings|payout|track|commission)/i, feature: "Earnings and payout tracking" },
    { keyword: /(?:search|discover|find)/i, feature: "Search and discovery" },
    { keyword: /(?:schedule|booking|slot|appointment)/i, feature: "Scheduling system" },
    { keyword: /(?:kyc|compliance|document|upload|verify)/i, feature: "Document and compliance management" },
    { keyword: /(?:admin|dashboard)/i, feature: "Admin dashboard" },
    { keyword: /(?:analytics|reporting|report)/i, feature: "Analytics and reporting" },
    { keyword: /(?:ios|apple)/i, feature: "iOS mobile app" },
    { keyword: /(?:android)/i, feature: "Android mobile app" },
    { keyword: /(?:website|web|portal)/i, feature: "Web portal" },
    { keyword: /(?:ai|recommend|predict|machine.learning|intelligence|forecast)/i, feature: "AI-powered features" },
    { keyword: /(?:warehouse|inventory|stock|depot|hub)/i, feature: "Warehouse and inventory management" },
    { keyword: /(?:gps|tracking|location|geo|map)/i, feature: "GPS and location tracking" },
    { keyword: /(?:route.*optim|optim.*route|navigation)/i, feature: "Route optimization" },
    { keyword: /(?:proof.*delivery|pod|delivery.*proof)/i, feature: "Proof of delivery" },
    { keyword: /(?:notification|alert|email|sms)/i, feature: "Notifications and alerts" },
    { keyword: /(?:stripe)/i, feature: "Stripe payment integration" },
    { keyword: /(?:razorpay)/i, feature: "Razorpay payment integration" },
    { keyword: /(?:currency|tax|gst|multi.*curren)/i, feature: "Tax and multi-currency support" },
    { keyword: /(?:dispatch|assign|allocat|manage)/i, feature: "Dispatch and allocation management" },
    { keyword: /(?:driver|rider|delivery.partner)/i, feature: "Driver and partner management" },
    { keyword: /(?:voice|speech|assistant)/i, feature: "Voice assistant" },
  ];
  return features.filter(f => f.keyword.test(text)).map(f => f.feature);
}

function extractFromRawText(rawInput) {
  log("fallback", "Attempting extraction from raw text");

  const budget = extractBudget(rawInput);
  const timeline = extractTimeline(rawInput);
  const countries = extractCountries(rawInput);
  const features = detectFeatures(rawInput);
  const projectType = extractProjectType(rawInput);
  const finance = extractFinanceValue(rawInput);

  const warnings = [];
  if (budget !== "Not Specified") warnings.push({ field: "budget", status: "ok", message: `Detected: ${budget}` });
  else warnings.push({ field: "budget", status: "missing", message: "No budget mentioned in input" });
  if (timeline !== "Not Specified") warnings.push({ field: "timeline", status: "ok", message: `Detected: ${timeline}` });
  else warnings.push({ field: "timeline", status: "missing", message: "No timeline mentioned in input" });
  if (features.length > 0) warnings.push({ field: "features", status: "ok", message: `${features.length} features detected` });
  else warnings.push({ field: "features", status: "missing", message: "No features detected" });
  if (countries.length > 0) warnings.push({ field: "countries", status: "ok", message: `Countries: ${countries.join(", ")}` });
  if (projectType !== "Unknown") warnings.push({ field: "projectType", status: "ok", message: `Type: ${projectType}` });
  else warnings.push({ field: "projectType", status: "partial", message: "Could not determine exact project type" });

  // Build title
  let title = "Project Brief";
  const titlePrefixMatch = rawInput.match(/(?:project|platform|app|system|website)\s+(?:called|named|for|is)\s+[""]?/i);
  if (titlePrefixMatch) {
    const after = rawInput.slice(titlePrefixMatch.index + titlePrefixMatch[0].length);
    const titleEndMatch = after.match(/^[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)*/);
    if (titleEndMatch) title = titleEndMatch[0].trim();
  }
  if (title === "Project Brief") {
    const properNounMatch = rawInput.match(/\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b/);
    if (properNounMatch && !/(?:January|February|March|April|May|June|July|August|September|October|November|December)/.test(properNounMatch[1])) {
      title = properNounMatch[1];
    }
  }

  // Build objectives from features
  const objectives = features.length > 0 ? features.slice(0, 5).map(f => `Build ${f.toLowerCase()}`) : ["Define core platform requirements"];

  // Build timeline
  const timelineDays = (() => {
    const m = timeline.match(/(\d+)/);
    if (m) {
      const num = parseInt(m[1]);
      if (/month/i.test(timeline)) return num * 30;
      if (/week/i.test(timeline)) return num * 7;
      if (/day/i.test(timeline)) return num;
      if (/year/i.test(timeline)) return num * 365;
      return num * 30;
    }
    return 0;
  })();

  const milestones = [];
  if (timelineDays > 0) {
    const phaseDays = Math.round(timelineDays / 3);
    const topFeatures = features.slice(0, 3).join(", ");
    milestones.push({
      milestone: "Core Platform — MVP",
      description: topFeatures ? `Core platform with ${topFeatures}` : "Core platform with essential features",
      estimatedDays: phaseDays,
    });
    milestones.push({
      milestone: "Integrations & Optimization",
      description: "Payment, notifications, tracking, and optimization features",
      estimatedDays: phaseDays,
    });
    milestones.push({
      milestone: "Scale & Analytics",
      description: "AI features, analytics dashboard, admin panel, and scale preparation",
      estimatedDays: phaseDays,
    });
  } else {
    milestones.push({ milestone: "Discovery & Planning", description: "Requirements gathering and architecture", estimatedDays: 0 });
  }

  // Build deliverables
  const deliverableNames = features.length > 0
    ? features.filter(f => !f.includes("integration")).slice(0, 6)
    : ["Core platform"];
  const deliverables = deliverableNames.map((name, i) => ({
    name,
    description: `Full implementation of ${name.toLowerCase()} module`,
    format: "Web / Mobile",
    duePhase: i < 3 ? "Phase 1" : i < 5 ? "Phase 2" : "Phase 3",
  }));

  // Build budget reality check
  const budgetRealityCheck = (() => {
    if (budget !== "Not Specified") {
      return {
        estimatedMarketCost: projectType === "Event Staffing Platform" ? "₹40L–₹80L" : "₹35L–₹60L",
        clientBudget: budget,
        gap: "Requires detailed scoping to confirm alignment",
        recommendation: `Client budget is ${budget}. Recommend MVP-first approach with phased delivery to align budget and scope.`,
      };
    }
    return {
      estimatedMarketCost: projectType === "Event Staffing Platform" ? "₹40L–₹80L" : "₹35L–₹60L",
      clientBudget: "Not specified",
      gap: "Cannot calculate — budget not provided",
      recommendation: "Request budget range before proceeding with detailed proposal.",
    };
  })();

  // Build pricing guidance
  const pricingGuidance = (() => {
    if (budget !== "Not Specified") {
      return {
        suggestedFixedPrice: budget,
        suggestedHourlyEquivalent: "₹1,500–₹3,000/hr estimated",
        suggestedMVPPrice: Math.round(parseInt(budget.replace(/[^\d]/g, "")) * 0.4).toString() + " (40% of budget for MVP)",
        suggestedRetainerOpportunity: "₹50,000–₹1,50,000/mo for ongoing maintenance and support",
        confidence: "Medium",
        confidenceReason: `Budget detected: ${budget}. Timeline: ${timeline}. Confidence is medium because full scope details are still unclear.`,
      };
    }
    return {
      suggestedFixedPrice: "Cannot estimate",
      suggestedHourlyEquivalent: "Cannot estimate",
      suggestedMVPPrice: "Cannot estimate",
      suggestedRetainerOpportunity: "Cannot estimate",
      confidence: "Low",
      confidenceReason: "No budget information provided. Pricing guidance requires budget context.",
    };
  })();

  // Build risks
  const risks = [];
  if (budget === "Not Specified") {
    risks.push({ risk: "Budget not specified", severity: "high", mitigation: "Request budget range before committing to scope", priority: "CRITICAL" });
  } else {
    risks.push({ risk: `Budget may be tight at ${budget} for full feature set`, severity: "medium", mitigation: "Propose MVP-first approach with phased delivery", priority: "IMPORTANT" });
  }
  if (countries.length > 1) {
    risks.push({ risk: `Multi-country launch (${countries.join(", ")}) adds compliance complexity`, severity: "medium", mitigation: "Research regulatory requirements for each market", priority: "IMPORTANT" });
  }
  if (features.length > 8) {
    risks.push({ risk: `${features.length} features requested — high scope complexity`, severity: "medium", mitigation: "Prioritize features and defer non-critical to later phases", priority: "IMPORTANT" });
  }
  if (/(?:mobile|ios|android)/i.test(rawInput) && /(?:web|website)/i.test(rawInput)) {
    risks.push({ risk: "Multi-platform (iOS + Android + Web) increases development effort 2-3x", severity: "high", mitigation: "Use cross-platform framework or phase platform launches", priority: "CRITICAL" });
  }
  if (risks.length === 0) {
    risks.push({ risk: "Project scope is undefined", severity: "high", mitigation: "Schedule a discovery call to define scope", priority: "CRITICAL" });
  }

  // Build discovery questions
  const questions = [];
  if (budget === "Not Specified") {
    questions.push({ question: "What is your budget range for this project?", context: "Budget determines the feasible scope and timeline", priority: "CRITICAL" });
  }
  if (timeline === "Not Specified") {
    questions.push({ question: "What is your desired timeline or launch date?", context: "Timeline affects resource planning and delivery approach", priority: "CRITICAL" });
  }
  if (features.length > 0) {
    questions.push({ question: `You mentioned ${features.length} features. Which are must-haves for v1 vs. nice-to-haves?`, context: "Feature prioritization is critical for scoping and pricing", priority: "CRITICAL" });
  }
  if (countries.length > 0) {
    questions.push({ question: `For the ${countries.join(", ")} launch, what compliance requirements apply (data residency, payment regulations)?`, context: "Multi-country launches have significant compliance implications", priority: "IMPORTANT" });
  }
  if (/(?:stripe|razorpay)/i.test(rawInput)) {
    questions.push({ question: "Do you need both Stripe and Razorpay at launch, or can one be phased in?", context: "Multiple payment gateways increase integration complexity", priority: "IMPORTANT" });
  }
  if (/(?:kyc|verification)/i.test(rawInput)) {
    questions.push({ question: "What KYC verification level is needed — basic ID check, background check, or in-person verification?", context: "KYC requirements vary by country and role type", priority: "CRITICAL" });
  }

  // Build client risk score
  const clientRiskLevel = (() => {
    let score = 0;
    if (budget !== "Not Specified") score++;
    if (timeline !== "Not Specified") score++;
    if (features.length > 3) score++;
    if (countries.length > 0) score++;
    if (score >= 3) return "Low";
    if (score >= 1) return "Medium";
    return "High";
  })();

  // Build project failure risk
  const failureFactors = [];
  if (budget === "Not Specified") failureFactors.push("Budget not specified");
  if (timeline === "Not Specified") failureFactors.push("Timeline not specified");
  if (countries.length > 1) failureFactors.push(`Multi-country compliance requirements (${countries.join(", ")})`);
  if (features.length > 10) failureFactors.push(`Large feature set (${features.length} features)`);
  if (failureFactors.length === 0) failureFactors.push("Requires further scoping to identify risks");

  // Build project decision
  const decisionAction = (() => {
    if (budget !== "Not Specified" && timeline !== "Not Specified" && features.length > 3) return "Accept with Conditions";
    if (budget !== "Not Specified" || timeline !== "Not Specified" || features.length > 3) return "Discovery Call Required";
    return "Discovery Call Required";
  })();

  // Build client response draft
  const responseDraft = (() => {
    let draft = "Thank you for sharing the project details.";
    if (features.length > 0) {
      draft += ` The features you mentioned (${features.slice(0, 3).join(", ")}${features.length > 3 ? ", and more" : ""}) provide a solid starting point.`;
    }
    if (budget !== "Not Specified" || timeline !== "Not Specified") {
      draft += " Based on the information provided,";
      if (budget !== "Not Specified") draft += ` we note a budget of ${budget}`;
      if (budget !== "Not Specified" && timeline !== "Not Specified") draft += " and";
      if (timeline !== "Not Specified") draft += ` a timeline of ${timeline}`;
      draft += ". We recommend approaching this with a phased MVP strategy to ensure delivery quality and budget alignment.";
    } else {
      draft += " We would love to better understand your budget range and desired timeline before preparing a proposal.";
    }
    draft += " Would it be possible to schedule a discovery call to discuss the requirements in more detail?";
    return draft;
  })();

  return {
    projectTitle: title,
    projectSummary: rawInput.length > 300 ? rawInput.slice(0, 300) + "..." : rawInput,
    executiveSummary: `A ${projectType.toLowerCase()} project was described targeting ${countries.length > 0 ? countries.join(", ") : "one or more markets"}. ${budget !== "Not Specified" ? `Budget: ${budget}. ` : ""}${timeline !== "Not Specified" ? `Timeline: ${timeline}. ` : ""}${features.length > 0 ? `${features.length} features detected.` : ""}`,
    objectives,
    scopeIncluded: features.length > 0 ? features : ["Requires Clarification"],
    scopeExcluded: ["Post-MVP enhancements beyond initial scope", "Third-party platform integrations beyond those mentioned"],
    assumptions: ["Timeline estimate assumes dedicated team allocation", "Budget assumes MVP-first delivery approach"],
    deliverables,
    timeline: milestones,
    paymentTerms: {
      estimatedBudget: budget,
      deposit: budget !== "Not Specified" ? "30-40% upfront" : "To be discussed",
      milestonePayments: budget !== "Not Specified" ? ["30% on MVP delivery", "30% on Phase 2", "20% on Phase 3", "20% on launch"] : ["To be structured per milestone"],
      finalPayment: budget !== "Not Specified" ? "20% on successful launch" : "To be discussed",
    },
    nextSteps: ["Schedule discovery call to clarify requirements", "Prioritize features for MVP", "Define technical architecture and platform choices", "Prepare phased proposal with budget breakdown"],
    redFlags: budget === "Not Specified" ? ["Budget not specified"] : [],
    confidenceScore: (() => {
      let score = 30;
      if (budget !== "Not Specified") score += 20;
      if (timeline !== "Not Specified") score += 15;
      if (features.length > 0) score += Math.min(features.length * 3, 20);
      if (countries.length > 0) score += 5;
      return Math.min(score, 85);
    })(),
    confidenceReason: `Extracted: ${budget !== "Not Specified" ? `budget ${budget}` : "no budget"}, ${timeline !== "Not Specified" ? `timeline ${timeline}` : "no timeline"}, ${features.length} features, ${countries.length} countries. ${projectType}.`,
    discoveryQuestions: questions,
    risks,
    scopeCreepWarnings: features.length > 8 ? [{ warning: `${features.length} features may expand beyond planned scope`, why: "Each feature requires design, development, testing, and deployment. Large feature sets inevitably grow during implementation." }] : [],
    missingRequirements: (() => {
      const reqs = [];
      if (budget === "Not Specified") reqs.push({ requirement: "Budget and payment terms", priority: "CRITICAL" });
      if (timeline === "Not Specified") reqs.push({ requirement: "Timeline and launch deadlines", priority: "CRITICAL" });
      reqs.push({ requirement: "Technical architecture decisions (backend, hosting, database)", priority: "IMPORTANT" });
      reqs.push({ requirement: "UI/UX design requirements and brand guidelines", priority: "IMPORTANT" });
      if (countries.length > 0) reqs.push({ requirement: `Compliance requirements for ${countries.join(", ")} markets`, priority: "IMPORTANT" });
      if (/(?:kyc|verification)/i.test(rawInput)) reqs.push({ requirement: "KYC flow details and verification provider selection", priority: "IMPORTANT" });
      return reqs;
    })(),
    upsellOpportunities: [
      { service: "Ongoing maintenance and support retainer", rationale: "Platforms require continuous updates, bug fixes, and feature enhancements post-launch" },
      { service: "Advanced analytics and business intelligence", rationale: "Deeper insights into platform usage, user behavior, and operational metrics" },
      { service: "DevOps and infrastructure monitoring", rationale: "Ensure 99.9% uptime with automated deployment, monitoring, and incident response" },
      { service: "Training, documentation, and onboarding", rationale: "Comprehensive training materials and onboarding for team and end users" },
    ].slice(0, features.length > 0 ? 4 : 1),
    effortAnalysis: { complexity: features.length > 8 ? "Very High" : features.length > 4 ? "High" : "Medium", breakdown: features.slice(0, 4).map(f => `${f} implementation`) },
    proposalReadinessBreakdown: {
      requirements: { score: features.length > 0 ? 5 : 2, missing: features.length > 0 ? ["Feature details and specifications needed"] : ["All requirements are unclear"] },
      technical: { score: 2, missing: ["No technical stack decisions provided", "Hosting and infrastructure not specified", "Integration specifications unclear"] },
      business: { score: countries.length > 0 ? 5 : 3, missing: countries.length > 0 ? ["Revenue model unclear"] : ["Business goals are partially clear", "Target market not fully defined"] },
      budget: { score: budget !== "Not Specified" ? 6 : 1, missing: budget !== "Not Specified" ? ["Budget breakdown per phase needed"] : ["No budget information provided"] },
      overallReadiness: (() => {
        let s = 2;
        if (budget !== "Not Specified") s += 2;
        if (timeline !== "Not Specified") s += 1;
        if (features.length > 0) s += 2;
        if (countries.length > 0) s += 1;
        return Math.min(s, 8);
      })(),
      explanation: `${features.length > 0 ? "Features provide some clarity. " : ""}${budget !== "Not Specified" ? `Budget is specified (${budget}). ` : "Budget needs clarification. "}${timeline !== "Not Specified" ? `Timeline is specified (${timeline}). ` : "Timeline needs clarification. "}Technical and implementation details are still needed.`,
    },
    numericalValidation: { isValid: true, warnings: budget !== "Not Specified" && features.length > 8 ? [`Budget (${budget}) may be insufficient for ${features.length} features`] : [] },
    budgetRealityCheck,
    proposalStrategy: (() => {
      const phases = [];
      const f = features;
      phases.push({
        name: "Phase 1 — MVP",
        items: [
          "Core platform with authentication and role management",
          f.length > 0 ? f.slice(0, 3).join(", ") : "Core feature set",
          "Essential integrations and basic workflows",
        ],
      });
      phases.push({
        name: "Phase 2 — Enhancements",
        items: [
          f.length > 3 ? f.slice(3, 6).join(", ") : "Advanced feature set",
          "Notifications, analytics, and reporting",
          "Admin panel and management tools",
        ],
      });
      phases.push({
        name: "Phase 3 — Scale",
        items: [
          f.length > 6 ? f.slice(6).join(", ") : "Remaining features",
          "AI-powered features and advanced optimization",
          "Performance tuning, scaling, and compliance hardening",
        ],
      });
      return phases;
    })(),
    dealKillers: (() => {
      const killers = [];
      if (budget === "Not Specified") killers.push("Budget not defined — cannot scope or price the project");
      if (timeline === "Not Specified") killers.push("Timeline not defined — cannot commit to delivery schedule");
      if (countries.length > 1) killers.push(`Multi-country compliance requirements (${countries.join(", ")}) must be clarified`);
      if (killers.length === 0) killers.push("Key integration requirements need clarification");
      return killers.slice(0, 4);
    })(),
    clientRiskScore: { level: clientRiskLevel, explanation: (() => {
      const parts = [];
      if (budget !== "Not Specified") parts.push(`budget specified (${budget})`);
      else parts.push("budget not specified");
      if (timeline !== "Not Specified") parts.push(`timeline specified (${timeline})`);
      else parts.push("timeline not specified");
      if (features.length > 0) parts.push(`${features.length} features described`);
      if (countries.length > 0) parts.push(`targeting ${countries.length} countries`);
      return `Based on: ${parts.join("; ")}. Overall risk: ${clientRiskLevel.toLowerCase()}.`;
    })() },
    pricingGuidance,
    profitabilityScore: (() => {
      const score = Math.min(Math.max(
        1 +
        (budget !== "Not Specified" ? 2 : 0) +
        (timeline !== "Not Specified" ? 1 : 0) +
        Math.min(features.length, 5) +
        (countries.length > 1 ? 1 : 0),
        1
      ), 8);
      const pros = [];
      const cons = [];
      if (budget !== "Not Specified") pros.push(`Budget defined: ${budget}`);
      else cons.push("Budget not specified");
      if (features.length > 0) pros.push(`Clear feature set (${features.length} features)`);
      else cons.push("No features specified");
      if (countries.length > 0) pros.push(`Multi-market opportunity (${countries.join(", ")})`);
      if (features.length > 8) cons.push(`Large feature set may strain budget`);
      if (budget !== "Not Specified" && features.length > 8) cons.push(`Potential budget-scope mismatch`);
      if (pros.length === 0) pros.push("Project identified as potential opportunity");
      return { score, pros, cons, explanation: `Scored ${score}/8 based on ${features.length} features, ${budget !== "Not Specified" ? "budget defined" : "budget missing"}, ${timeline !== "Not Specified" ? "timeline defined" : "timeline missing"}, ${countries.length} target markets.` };
    })(),
    negotiationStrategy: {
      recommendedPosition: budget !== "Not Specified" && features.length > 3 ? "Propose MVP-first approach to align budget and timeline" : "Schedule discovery call before committing to any position",
      avoid: "Fixed-price commitment for the full feature set without proper scoping",
      talkingPoints: [
        features.length > 0 ? `Focus Phase 1 on core platform value — ${features.slice(0, 3).join(", ")}` : "Focus Phase 1 on core platform and essential integrations",
        `Defer advanced features (${features.slice(3, 5).join(", ") || "analytics, AI"}) to Phase 2/3 based on real-world feedback`,
        countries.length > 0 ? `Target ${countries[0]} first, then expand to ${countries.slice(1).join(", ")}` : "Launch in a single market first, then expand regionally",
        "Protect timeline and budget by prioritizing ruthlessly",
      ],
    },
    clientTypeClassification: (() => {
      if (/(?:investor|funding|raise)/i.test(rawInput)) return { type: "Startup (Fundraising)", buyingBehavior: "Investor-driven — needs impressive demo for next round", riskProfile: "Medium — may pivot based on investor feedback", decisionSpeed: "Fast — needs results before funding round", scopeChangeLikelihood: "Medium — direction may shift post-funding" };
      if (/(?:enterprise|corporate)/i.test(rawInput)) return { type: "Enterprise", buyingBehavior: "Formal procurement process with multiple stakeholders", riskProfile: "Low — typically well-funded with clear requirements", decisionSpeed: "Slow — requires approvals", scopeChangeLikelihood: "Low — well-defined requirements" };
      return {
        type: projectType === "Event Staffing Platform" ? "Startup" : projectType === "Unknown" ? "Startup" : "Business",
        buyingBehavior: "Looking for a reliable development partner to build a scalable platform",
        riskProfile: budget !== "Not Specified" ? "Low to Medium — budget provides some certainty" : "Medium — budget uncertainty increases risk",
        decisionSpeed: "Fast to Medium — typical for fundraising-stage startups",
        scopeChangeLikelihood: "Medium — common for early-stage platform builds",
      };
    })(),
    projectFailureRisk: {
      level: failureFactors.length > 2 ? "High" : failureFactors.length > 0 ? "Medium" : "Low",
      factors: failureFactors,
      explanation: `Risk is ${failureFactors.length > 2 ? "elevated" : "manageable"} due to ${failureFactors.slice(0, 2).join("; ")}.${countries.length > 0 ? ` Multi-country (${countries.join(", ")}) adds some complexity.` : ""}`,
    },
    projectDecision: {
      action: decisionAction,
      reasoning: (() => {
        const parts = [];
        if (budget !== "Not Specified" && timeline !== "Not Specified" && features.length > 3) {
          parts.push("The client provided budget, timeline, and feature requirements");
          parts.push("Recommend proceeding with a phased proposal, clarifying technical architecture and compliance needs in a discovery call");
        } else {
          if (budget === "Not Specified") parts.push("Budget was not specified");
          if (timeline === "Not Specified") parts.push("Timeline was not specified");
          if (features.length === 0) parts.push("No feature requirements were mentioned");
          parts.push("A discovery call is needed to gather these details before proceeding with a proposal");
        }
        return parts.join(". ") + ".";
      })(),
    },
    clientResponseDraft: responseDraft,
    extractionWarnings: warnings,
  };
}

function createFallbackBrief(rawInput) {
  const truncated = rawInput.length > 500 ? rawInput.slice(0, 500) + "..." : rawInput;
  return {
    projectTitle: "Project Brief",
    clientName: "Client",
    projectSummary: truncated,
    executiveSummary: "The input was too ambiguous to generate a full structured brief.",
    objectives: ["Requires Clarification"],
    scopeIncluded: ["Requires Clarification"],
    scopeExcluded: ["Not Specified"],
    assumptions: ["Information is limited — further clarification needed"],
    deliverables: [{ name: "Requires Clarification", description: "Not specified by client", format: "To be determined", duePhase: "To be determined" }],
    timeline: [{ milestone: "Kickoff", description: "Requires Clarification", estimatedDays: 0 }],
    paymentTerms: { estimatedBudget: "Not Specified", deposit: "Not Specified", milestonePayments: ["To be discussed"], finalPayment: "To be discussed" },
    nextSteps: ["Schedule a discovery call to clarify requirements"],
    redFlags: ["Very limited information provided"],
    confidenceScore: 15,
    confidenceReason: "The input was too short or too ambiguous to extract meaningful project details.",
    discoveryQuestions: [
      { question: "Can you describe your project in more detail?", context: "The initial message lacked sufficient detail to generate a structured brief", priority: "CRITICAL" },
      { question: "What is your budget range for this project?", context: "Budget is a key factor in determining project feasibility", priority: "CRITICAL" },
      { question: "What is your desired timeline?", context: "Timeline affects scope and pricing decisions", priority: "CRITICAL" },
    ],
    risks: [{ risk: "Project scope is entirely undefined", severity: "high", mitigation: "Schedule a discovery call to define scope before proceeding", priority: "CRITICAL" }],
    scopeCreepWarnings: [{ warning: "Undefined scope is the biggest risk", why: "Without clear requirements, the project will expand indefinitely" }],
    missingRequirements: [{ requirement: "Project requirements, objectives, and deliverables", priority: "CRITICAL" }],
    upsellOpportunities: [],
    effortAnalysis: { complexity: "Medium", breakdown: ["Cannot estimate — requirements are unclear"] },
    proposalReadinessBreakdown: {
      requirements: { score: 1, missing: ["All requirements are unclear"] },
      technical: { score: 1, missing: ["No technical details provided"] },
      business: { score: 2, missing: ["Business goals are unclear"] },
      budget: { score: 1, missing: ["No budget information provided"] },
      overallReadiness: 1,
      explanation: "Too little information to create a reliable proposal",
    },
    numericalValidation: { isValid: true, warnings: [] },
    budgetRealityCheck: { estimatedMarketCost: "Cannot estimate", clientBudget: "Not specified", gap: "Cannot calculate", recommendation: "Ask the client for their budget range during the discovery call" },
    proposalStrategy: [{ name: "Discovery Phase", items: ["Schedule a discovery call", "Define project requirements", "Establish budget and timeline"] }],
    dealKillers: ["No clear project requirements"],
    clientRiskScore: { level: "High", explanation: "The input is too vague to assess project risk." },
    pricingGuidance: { suggestedFixedPrice: "Cannot estimate", suggestedHourlyEquivalent: "Cannot estimate", suggestedMVPPrice: "Cannot estimate", suggestedRetainerOpportunity: "Not applicable", confidence: "Low", confidenceReason: "Insufficient information to provide pricing guidance" },
    profitabilityScore: { score: 1, pros: [], cons: ["No clear requirements", "No budget defined", "No timeline defined"], explanation: "Cannot assess profitability without project details" },
    negotiationStrategy: { recommendedPosition: "Schedule a discovery call first", avoid: "Committing to any price or timeline", talkingPoints: ["Let's start with a discovery call to understand your needs", "Once we have clarity, I can provide an accurate estimate"] },
    clientTypeClassification: { type: "Startup", buyingBehavior: "Unknown — insufficient data", riskProfile: "Unknown", decisionSpeed: "Unknown", scopeChangeLikelihood: "Unknown" },
    projectFailureRisk: { level: "High", factors: ["No defined scope", "No budget", "No timeline"], explanation: "The risk cannot be properly assessed, but the lack of information itself is a major risk factor" },
    projectDecision: { action: "Discovery Call Required", reasoning: "The input lacks sufficient detail to make a project decision." },
    clientResponseDraft: "Thank you for reaching out. To provide an accurate proposal, I would like to understand your project requirements in more detail.",
    extractionWarnings: [],
  };
}

function countExtractedFields(brief) {
  const fields = [
    { name: "projectTitle", check: () => isFieldPresent(brief.projectTitle) && brief.projectTitle !== "Project Brief" },
    { name: "clientName", check: () => isFieldPresent(brief.clientName) && brief.clientName !== "Client" },
    { name: "projectSummary", check: () => isFieldPresent(brief.projectSummary) },
    { name: "executiveSummary", check: () => isFieldPresent(brief.executiveSummary) },
    { name: "objectives", check: () => brief.objectives?.length > 0 && !brief.objectives.every(o => /requires clarification|unknown|not specified/i.test(o)) },
    { name: "budget", check: () => isFieldPresent(brief.paymentTerms?.estimatedBudget) && !/not specified|cannot estimate/i.test(brief.paymentTerms?.estimatedBudget || "") },
    { name: "timeline", check: () => brief.timeline?.length > 0 && brief.timeline.some(t => t.estimatedDays > 0 || (isFieldPresent(t.milestone) && !/requires clarification|kickoff/i.test(t.milestone))) },
    { name: "deliverables", check: () => brief.deliverables?.length > 0 },
    { name: "risks", check: () => brief.risks?.length > 0 && !brief.risks.every(r => /project scope is entirely undefined/i.test(r.risk)) },
    { name: "discoveryQuestions", check: () => brief.discoveryQuestions?.length > 0 && !brief.discoveryQuestions.every(q => /describe your project/i.test(q.question)) },
    { name: "scopeIncluded", check: () => brief.scopeIncluded?.length > 0 && !brief.scopeIncluded.every(s => /requires clarification|unknown/i.test(s)) },
    { name: "dealKillers", check: () => brief.dealKillers?.length > 0 && !brief.dealKillers.every(d => /no clear project/i.test(d)) },
    { name: "projectDecision", check: () => brief.projectDecision?.action && brief.projectDecision.action !== "Discovery Call Required" ? true : (brief.projectDecision?.reasoning && !/lacks sufficient detail/i.test(brief.projectDecision.reasoning)) },
    { name: "clientResponseDraft", check: () => isFieldPresent(brief.clientResponseDraft) && !/requesting a brief/i.test(brief.clientResponseDraft) },
  ];

  let present = 0;
  const missing = [];
  const warnings = [];

  for (const { name, check } of fields) {
    try {
      if (check()) {
        present++;
        warnings.push({ field: name, status: "ok", message: "Detected" });
      } else {
        missing.push(name);
        warnings.push({ field: name, status: "missing", message: `Not found in input` });
      }
    } catch {
      missing.push(name);
      warnings.push({ field: name, status: "missing", message: "Error checking field" });
    }
  }

  return { total: fields.length, present, missing, warnings };
}

function repairJSON(text) {
  let result = text.trim();
  result = result.replace(/^```(?:json)?\s*/gm, "").replace(/```\s*$/gm, "").trim();
  const firstBrace = result.indexOf("{");
  const lastBrace = result.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) result = result.slice(firstBrace, lastBrace + 1);
  result = result.replace(/,\s*}/g, "}").replace(/,\s*\]/g, "]");
  result = result.replace(/(\s*:\s*)'([^']*)'/g, '$1"$2"');
  result = result.replace(/{\s*'([^']*)'/g, '{"$1"');
  result = result.replace(/,\s*'([^']*)'/g, ', "$1"');
  result = result.replace(/(\{|,)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  result = result.replace(/\n/g, " ").replace(/\r/g, "").replace(/\t/g, " ");
  result = result.replace(/,\s*([}\]])/g, "$1");
  result = result.replace(/'/g, '"');
  return result;
}

function parseWithRepair(text) {
  try { const p = JSON.parse(text); return p; }
  catch (err) {}
  const repaired = repairJSON(text);
  try { const p = JSON.parse(repaired); return p; }
  catch (err) {}
  try {
    const objMatch = repaired.match(/\{[\s\S]*\}/);
    if (objMatch) { const p = JSON.parse(objMatch[0]); return p; }
  } catch {}
  return null;
}

// ─── Merge Logic (Attempt 3 from generateBrief.ts) ──────────────────────────

function merge(extracted, fallback) {
  const merged = {
    ...fallback,
    ...extracted,
    projectTitle: extracted.projectTitle || fallback.projectTitle,
    projectSummary: extracted.projectSummary || fallback.projectSummary,
    executiveSummary: extracted.executiveSummary || fallback.executiveSummary,
    objectives: (extracted.objectives?.length || 0) > 0 ? extracted.objectives : fallback.objectives,
    scopeIncluded: (extracted.scopeIncluded?.length || 0) > 0 ? extracted.scopeIncluded : fallback.scopeIncluded,
    deliverables: (extracted.deliverables?.length || 0) > 0 ? extracted.deliverables : fallback.deliverables,
    timeline: (extracted.timeline?.length || 0) > 0 ? extracted.timeline : fallback.timeline,
    paymentTerms: extracted.paymentTerms || fallback.paymentTerms,
    risks: (extracted.risks?.length || 0) > 0 ? extracted.risks : fallback.risks,
    discoveryQuestions: (extracted.discoveryQuestions?.length || 0) > 0 ? extracted.discoveryQuestions : fallback.discoveryQuestions,
    missingRequirements: (extracted.missingRequirements?.length || 0) > 0 ? extracted.missingRequirements : fallback.missingRequirements,
    upsellOpportunities: (extracted.upsellOpportunities?.length || 0) > 0 ? extracted.upsellOpportunities : fallback.upsellOpportunities,
    scopeCreepWarnings: (extracted.scopeCreepWarnings?.length || 0) > 0 ? extracted.scopeCreepWarnings : fallback.scopeCreepWarnings,
    nextSteps: (extracted.nextSteps?.length || 0) > 0 ? extracted.nextSteps : fallback.nextSteps,
    redFlags: (extracted.redFlags?.length || 0) > 0 ? extracted.redFlags : fallback.redFlags,
    effortAnalysis: extracted.effortAnalysis || fallback.effortAnalysis,
    proposalReadinessBreakdown: extracted.proposalReadinessBreakdown || fallback.proposalReadinessBreakdown,
    numericalValidation: extracted.numericalValidation || fallback.numericalValidation,
    budgetRealityCheck: extracted.budgetRealityCheck || fallback.budgetRealityCheck,
    proposalStrategy: (extracted.proposalStrategy?.length || 0) > 0 ? extracted.proposalStrategy : fallback.proposalStrategy,
    dealKillers: (extracted.dealKillers?.length || 0) > 0 ? extracted.dealKillers : fallback.dealKillers,
    clientRiskScore: extracted.clientRiskScore || fallback.clientRiskScore,
    pricingGuidance: extracted.pricingGuidance || fallback.pricingGuidance,
    profitabilityScore: extracted.profitabilityScore || fallback.profitabilityScore,
    negotiationStrategy: extracted.negotiationStrategy || fallback.negotiationStrategy,
    clientTypeClassification: extracted.clientTypeClassification || fallback.clientTypeClassification,
    projectFailureRisk: extracted.projectFailureRisk || fallback.projectFailureRisk,
    projectDecision: extracted.projectDecision || fallback.projectDecision,
    clientResponseDraft: extracted.clientResponseDraft || fallback.clientResponseDraft,
    extractionWarnings: extracted.extractionWarnings || [],
  };
  return merged;
}

// ─── Test Runner ─────────────────────────────────────────────────────────────

function runAssertion(label, pass, detail) {
  const mark = pass ? "✓ PASS" : "✗ FAIL";
  console.log(`  ${mark}: ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) process.exitCode = 1;
}

function run() {
  const input = readFileSync(join(__dirname, "fixtures", "crewlink-input.txt"), "utf-8");
  console.log("=".repeat(72));
  console.log("SCOPEDROP EXTRACTION PIPELINE TEST");
  console.log("=".repeat(72));
  console.log(`\nInput length: ${input.length} chars`);
  console.log("\n── STEP 1: Raw Extraction Tests ──\n");

  // Test basic extraction functions
  const budget = extractBudget(input);
  runAssertion("extractBudget", budget !== "Not Specified", `Found: ${budget}`);
  runAssertion("budget contains 12", budget.includes("12"), "Budget value preserved");
  runAssertion("budget contains lakh", /lakh/i.test(budget), "Budget unit preserved");

  const timeline = extractTimeline(input);
  runAssertion("extractTimeline", timeline !== "Not Specified", `Found: ${timeline}`);
  runAssertion("timeline contains 3", /3/.test(timeline), "Timeline value preserved");
  runAssertion("timeline contains month", /month/i.test(timeline), "Timeline unit preserved");

  const countries = extractCountries(input);
  runAssertion("extractCountries — India", countries.includes("India"), "India detected");
  runAssertion("extractCountries — UAE", countries.includes("UAE"), "UAE detected");
  runAssertion("extractCountries count", countries.length === 2, "Exactly 2 countries");

  const features = detectFeatures(input);
  runAssertion("detectFeatures returns array", Array.isArray(features), `${features.length} features`);
  const expectedFeatures = [
    "User profile and verification management",
    "Task and delivery management",
    "Payment and billing processing",
    "Review and feedback system",
    "Messaging and communication",
    "Earnings and payout tracking",
    "Search and discovery",
    "Scheduling system",
    "Document and compliance management",
    "Admin dashboard",
    "AI-powered features",
    "Notifications and alerts",
    "Stripe payment integration",
    "Razorpay payment integration",
    "iOS mobile app",
    "Android mobile app",
    "Web portal",
  ];
  for (const ef of expectedFeatures) {
    runAssertion(`feature "${ef}"`, features.includes(ef), "Matched");
  }
  // Check that "Analytics and reporting" is NOT detected (not in CrewLink input)
  runAssertion("feature NOT detected — analytics", !features.includes("Analytics and reporting"), "Correctly absent");

  const projectType = extractProjectType(input);
  runAssertion("extractProjectType", projectType !== "Unknown", `Type: ${projectType}`);
  runAssertion("projectType is Event Staffing", projectType === "Event Staffing Platform", "Correct type");

  // Test repairJSON
  console.log("\n── STEP 2: JSON Repair Tests ──\n");
  const malformedTrailingComma = '{"name": "CrewLink", "budget": "₹12 lakhs",}';
  const repaired1 = repairJSON(malformedTrailingComma);
  runAssertion("remove trailing comma", !repaired1.includes(",}"), "Comma removed");
  runAssertion("repair still valid JSON", parseWithRepair(malformedTrailingComma) !== null, "Parses after repair");

  const malformedSingleQuotes = "{'name': 'CrewLink', 'budget': '₹12 lakhs'}";
  const repaired2 = repairJSON(malformedSingleQuotes);
  runAssertion("fix single quotes", !repaired2.includes("'"), "Single quotes replaced");
  runAssertion("single quote JSON valid", parseWithRepair(malformedSingleQuotes) !== null, "Parses after repair");

  const malformedUnquoted = "{name: \"CrewLink\", budget: \"₹12 lakhs\"}";
  const repaired3 = repairJSON(malformedUnquoted);
  runAssertion("fix unquoted keys", !/:\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(repaired3), "Keys quoted");
  runAssertion("unquoted JSON valid", parseWithRepair(malformedUnquoted) !== null, "Parses after repair");

  const markdownFence = "```json\n{\"name\": \"CrewLink\"}\n```";
  const repaired4 = repairJSON(markdownFence);
  runAssertion("remove markdown fences", !repaired4.includes("```"), "Fences removed");
  runAssertion("markdown JSON valid", parseWithRepair(markdownFence) !== null, "Parses after repair");

  // Test full extraction
  console.log("\n── STEP 3: Full extractFromRawText ──\n");
  const extracted = extractFromRawText(input);
  runAssertion("extracted is object", typeof extracted === "object" && extracted !== null, "");
  runAssertion("extracted.projectTitle", extracted.projectTitle !== "Project Brief", `Title: ${extracted.projectTitle}`);
  runAssertion("extracted.projectTitle — contains CrewLink", extracted.projectTitle === "CrewLink", "Title correctly extracted");
  runAssertion("extracted.paymentTerms.estimatedBudget", extracted.paymentTerms?.estimatedBudget !== "Not Specified", `Budget: ${extracted.paymentTerms?.estimatedBudget}`);
  runAssertion("extracted.timeline has milestones", extracted.timeline?.length > 0, `${extracted.timeline?.length} milestones`);
  runAssertion("extracted.timeline has estimatedDays > 0", extracted.timeline?.some(t => t.estimatedDays > 0), "Days calculated");
  runAssertion("extracted has deliverables", extracted.deliverables?.length > 0, `${extracted.deliverables?.length} deliverables`);
  runAssertion("extracted has risks", extracted.risks?.length > 0, `${extracted.risks?.length} risks`);
  runAssertion("extracted has discovery questions", extracted.discoveryQuestions?.length > 0, `${extracted.discoveryQuestions?.length} questions`);
  runAssertion("extracted has budgetRealityCheck", extracted.budgetRealityCheck?.clientBudget !== undefined, `clientBudget: ${extracted.budgetRealityCheck?.clientBudget}`);
  runAssertion("extracted has pricingGuidance", extracted.pricingGuidance?.confidence !== undefined, `confidence: ${extracted.pricingGuidance?.confidence}`);
  runAssertion("extracted has profitabilityScore", extracted.profitabilityScore?.score > 0, `score: ${extracted.profitabilityScore?.score}/8`);
  runAssertion("extracted has negotiationStrategy", extracted.negotiationStrategy?.recommendedPosition !== undefined, "Strategy present");
  runAssertion("extracted has clientTypeClassification", extracted.clientTypeClassification?.type !== undefined, `Type: ${extracted.clientTypeClassification?.type}`);
  runAssertion("extracted has projectFailureRisk", extracted.projectFailureRisk?.level !== undefined, `Risk: ${extracted.projectFailureRisk?.level}`);
  runAssertion("extracted has projectDecision", extracted.projectDecision?.action !== undefined, `Action: ${extracted.projectDecision?.action}`);
  runAssertion("extracted has clientResponseDraft", extracted.clientResponseDraft?.length > 0, "Draft present");
  runAssertion("extracted has extractionWarnings", Array.isArray(extracted.extractionWarnings), `${extracted.extractionWarnings?.length} warnings`);

  // Verify budget appears in all critical fields
  const budgetStr = extracted.paymentTerms?.estimatedBudget;
  runAssertion("budgetRealityCheck references budget", extracted.budgetRealityCheck?.clientBudget === budgetStr, "Budget propagated");
  runAssertion("pricingGuidance references budget", extracted.pricingGuidance?.suggestedFixedPrice === budgetStr, "Budget propagated to pricing");

  // Verify timeline days
  const days = extracted.timeline?.[0]?.estimatedDays;
  runAssertion("timeline days ≈ 30 (3 months / 3 phases)", days >= 25 && days <= 35, `${days} days per phase`);

  // Verify redFlags is NOT set (budget IS specified)
  runAssertion("extracted.redFlags empty (budget exists)", extracted.redFlags?.length === 0, "No red flags when budget present");

  // Test merge logic with fallback
  console.log("\n── STEP 4: Merge with Fallback (Attempt 3 simulation) ──\n");
  const fallback = createFallbackBrief(input);
  const merged = merge(extracted, fallback);

  // Critical: merged must NOT contain fallback's generic values
  runAssertion("merged.budget is NOT 'Not Specified'", merged.paymentTerms.estimatedBudget !== "Not Specified", `Budget: ${merged.paymentTerms.estimatedBudget}`);
  runAssertion("merged.budgetRealityCheck.clientBudget is NOT 'Not specified'", merged.budgetRealityCheck.clientBudget !== "Not specified", `clientBudget: ${merged.budgetRealityCheck.clientBudget}`);
  runAssertion("merged.timeline[0].estimatedDays > 0", merged.timeline[0].estimatedDays > 0, `${merged.timeline[0].estimatedDays} days`);
  runAssertion("merged.pricingGuidance.confidence is NOT 'Low'", merged.pricingGuidance.confidence !== "Low", `Confidence: ${merged.pricingGuidance.confidence}`);
  runAssertion("merged.projectDecision is NOT 'Discovery Call Required'", merged.projectDecision.action !== "Discovery Call Required", `Action: ${merged.projectDecision.action}`);
  runAssertion("merged.proposalReadinessBreakdown.budget.score > 1", merged.proposalReadinessBreakdown.budget.score > 1, `Budget readiness: ${merged.proposalReadinessBreakdown.budget.score}/10`);
  runAssertion("merged.clientRiskScore.level is NOT 'High'", merged.clientRiskScore.level !== "High", `Risk: ${merged.clientRiskScore.level}`);
  runAssertion("merged.clientResponseDraft includes budget mention", merged.clientResponseDraft.includes("budget"), "Draft uses budget");

  // Test countExtractedFields
  console.log("\n── STEP 5: countExtractedFields (Final Validation) ──\n");
  const fieldReport = countExtractedFields(merged);
  runAssertion("fields present >= 10", fieldReport.present >= 10, `${fieldReport.present}/${fieldReport.total} fields present`);
  runAssertion("field warnings match present count", fieldReport.warnings.length === fieldReport.total, `${fieldReport.warnings.length} warnings (${fieldReport.total} expected)`);
  runAssertion("budget field is ok", fieldReport.warnings.some(w => w.field === "budget" && w.status === "ok"), "Budget status: ok");
  runAssertion("timeline field is ok", fieldReport.warnings.some(w => w.field === "timeline" && w.status === "ok"), "Timeline status: ok");

  // List all missing fields
  if (fieldReport.missing.length > 0) {
    console.log(`\n  Missing fields (${fieldReport.missing.length}):`);
    for (const m of fieldReport.missing) {
      console.log(`    - ${m}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(72));
  console.log("RESULTS SUMMARY");
  console.log("=".repeat(72));
  console.log(`  Total fields checked : ${fieldReport.total}`);
  console.log(`  Fields present      : ${fieldReport.present}`);
  console.log(`  Fields missing      : ${fieldReport.missing.length}`);
  console.log(`  Extraction warnings : ${extracted.extractionWarnings?.length || 0}`);
  console.log(`  Budget              : ${merged.paymentTerms.estimatedBudget}`);
  console.log(`  Timeline            : ${merged.timeline.map(t => `${t.milestone} (${t.estimatedDays}d)`).join(", ")}`);
  console.log(`  Countries           : ${extractCountries(input).join(", ")}`);
  console.log(`  Features            : ${detectFeatures(input).length}`);
  console.log(`  Project Type        : ${extractProjectType(input)}`);
  console.log(`  Title               : ${merged.projectTitle}`);
  console.log(`  Confidence          : ${merged.confidenceScore}`);
  console.log(`  Decision            : ${merged.projectDecision.action}`);
  console.log(`  Client Risk         : ${merged.clientRiskScore.level}`);
  console.log(`  Failure Risk        : ${merged.projectFailureRisk.level}`);
  console.log(`  Profitability       : ${merged.profitabilityScore.score}/8`);
  console.log(`  Pricing Confidence  : ${merged.pricingGuidance.confidence}`);
  console.log(`  Readiness           : ${merged.proposalReadinessBreakdown.overallReadiness}/10`);

  const allPassed = process.exitCode === undefined || process.exitCode === 0;
  console.log(`\n  ${allPassed ? "ALL TESTS PASSED ✓" : "SOME TESTS FAILED ✗"}`);
  console.log("");
}

run();
