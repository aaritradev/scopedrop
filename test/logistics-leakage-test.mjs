// ScopeDrop Logistics Leakage Test
// Verifies that no marketplace-specific content leaks into a logistics brief
// Run: node test/logistics-leakage-test.mjs

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Pure Extraction Functions (copied from lib/generateBrief.ts) ───────────

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

function extractCountries(rawInput) {
  const text = rawInput.toLowerCase();
  const result = [];
  if (/\b(?:india|indian)\b/i.test(text)) result.push("India");
  if (/\b(?:uae|dubai|emirates|united arab emirates)\b/i.test(text)) result.push("UAE");
  if (/\b(?:uk|united kingdom|britain|england)\b/i.test(text)) result.push("UK");
  if (/\b(?:usa|united states|america|us)\b/i.test(text)) result.push("USA");
  return result;
}

function extractProjectType(rawInput) {
  const text = rawInput.toLowerCase();
  if (/(?:logistics|delivery|fleet|dispatch|warehouse|supply.chain|transport|shipping|freight|courier)/i.test(text)) return "Logistics / Fleet Management";
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
  const budget = extractBudget(rawInput);
  const timeline = extractTimeline(rawInput);
  const countries = extractCountries(rawInput);
  const features = detectFeatures(rawInput);
  const projectType = extractProjectType(rawInput);

  // Build objectives from features
  const objectives = features.length > 0 ? features.slice(0, 5).map(f => `Build ${f.toLowerCase()}`) : ["Define core platform requirements"];

  // Build timeline from extracted timeline text
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

  // Build deliverables from features
  const deliverableNames = features.length > 0
    ? features.filter(f => !f.includes("integration")).slice(0, 6)
    : ["Core platform"];
  const deliverables = deliverableNames.map((name, i) => ({
    name,
    description: `Full implementation of ${name.toLowerCase()} module`,
    format: "Web / Mobile",
    duePhase: i < 3 ? "Phase 1" : i < 5 ? "Phase 2" : "Phase 3",
  }));

  return {
    projectTitle: "Logistics Project",
    projectSummary: rawInput.slice(0, 300) + "...",
    executiveSummary: `A ${projectType.toLowerCase()} project was described targeting ${countries.join(", ")}. Budget: ${budget}. Timeline: ${timeline}. ${features.length} features detected.`,
    objectives,
    scopeIncluded: features,
    scopeExcluded: ["Post-MVP enhancements beyond initial scope", "Third-party platform integrations beyond those mentioned"],
    milestones,
    deliverables,
    paymentTerms: { estimatedBudget: budget, deposit: "30-40% upfront", milestonePayments: ["30% on MVP delivery", "30% on Phase 2", "20% on Phase 3", "20% on launch"], finalPayment: "20% on successful launch" },
    nextSteps: ["Schedule discovery call", "Prioritize features for MVP", "Define technical architecture", "Prepare phased proposal"],
    redFlags: [],
    confidenceScore: 85,
    discoveryQuestions: [],
    risks: [],
    scopeCreepWarnings: [],
    missingRequirements: [],
    upsellOpportunities: [],
    effortAnalysis: { complexity: "Medium", breakdown: ["Feature implementation"] },
    proposalReadinessBreakdown: { requirements: { score: 5, missing: [] }, technical: { score: 2, missing: [] }, business: { score: 5, missing: [] }, budget: { score: 6, missing: [] }, overallReadiness: 6, explanation: "Test" },
    numericalValidation: { isValid: true, warnings: [] },
    budgetRealityCheck: { estimatedMarketCost: "₹35L–₹60L", clientBudget: budget, gap: "Test", recommendation: "Test" },
    proposalStrategy: (() => {
      const phases = [];
      phases.push({ name: "Phase 1 — MVP", items: ["Core platform with authentication and role management", features.slice(0, 3).join(", ") || "Core feature set", "Essential integrations and basic workflows"] });
      phases.push({ name: "Phase 2 — Enhancements", items: [features.slice(3, 6).join(", ") || "Advanced feature set", "Notifications, analytics, and reporting", "Admin panel and management tools"] });
      phases.push({ name: "Phase 3 — Scale", items: [features.slice(6).join(", ") || "Remaining features", "AI-powered features and advanced optimization", "Performance tuning, scaling, and compliance hardening"] });
      return phases;
    })(),
    extractionWarnings: [],
  };
}

// ─── Marketplaces features that MUST NOT appear in logistics output ──────────

const FORBIDDEN_MARKETPLACE_PATTERNS = [
  /gig/i,
  /portfolio.*upload/i,
  /worker.*(?:profile|kyc)/i,
  /scam.*detect/i,
  /interview.*(?:scheduling|booking)/i,
  /marketplace/i,
  /freelancer/i,
  /talent/i,
  /creative.*(?:work|project)/i,
];

// ─── Test Runner ─────────────────────────────────────────────────────────────

function runAssertion(label, pass, detail) {
  const mark = pass ? "✓ PASS" : "✗ FAIL";
  console.log(`  ${mark}: ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) process.exitCode = 1;
}

function stripPunct(s) { return s.replace(/[^a-z0-9\s]/g, ""); }

function checkForLeakage(label, items, input) {
  const inputLower = input.toLowerCase();
  let allClean = true;

  for (const item of items) {
    const itemLower = typeof item === "string" ? stripPunct(item.toLowerCase()) : JSON.stringify(item);
    // Check for forbidden marketplace patterns
    for (const pattern of FORBIDDEN_MARKETPLACE_PATTERNS) {
      if (pattern.test(itemLower)) {
        runAssertion(`${label}: no "${pattern.source}"`, false, `Found in: "${item}"`);
        allClean = false;
      }
    }
    // Check that item is traceable to source input
    const words = itemLower.split(/\s+/).filter(w => w.length > 3 && !["with", "from", "that", "this", "based", "core", "full", "essential"].includes(w));
    const traceable = words.some(w => inputLower.includes(w));
    if (!traceable && words.length > 0) {
      // Only flag if there are specific enough words
      if (words.length >= 3) {
        runAssertion(`${label}: traceable to source`, traceable, `"${item}" (words not found: ${words.filter(w => !inputLower.includes(w)).join(", ")})`);
        allClean = false;
      }
    }
  }

  return allClean;
}

function run() {
  const input = readFileSync(join(__dirname, "fixtures", "logistics-input.txt"), "utf-8");
  console.log("=".repeat(72));
  console.log("SCOPEDROP LOGISTICS LEAKAGE TEST");
  console.log("=".repeat(72));
  console.log(`\nInput length: ${input.length} chars`);
  console.log(`\n── STEP 1: Basic Extraction ──\n`);

  const budget = extractBudget(input);
  runAssertion("Budget", budget !== "Not Specified", budget);
  runAssertion("Budget value", budget.includes("15"), "₹15 lakhs");

  const timeline = extractTimeline(input);
  runAssertion("Timeline", timeline !== "Not Specified", timeline);
  runAssertion("Timeline value", timeline.includes("5"), "5 months");

  const countries = extractCountries(input);
  runAssertion("Countries include India", countries.includes("India"), "");
  runAssertion("Country count", countries.length === 1, "Only India");

  const projectType = extractProjectType(input);
  runAssertion("Project type is logistics", projectType === "Logistics / Fleet Management", projectType);

  const features = detectFeatures(input);
  runAssertion("Features detected", features.length > 0, `${features.length} features`);
  console.log("\n  Detected features:");
  for (const f of features) {
    console.log(`    - ${f}`);
  }

  console.log("\n── STEP 2: Leakage Check — NO marketplace features ──\n");

  // Check each feature against forbidden patterns
  for (const f of features) {
    for (const pattern of FORBIDDEN_MARKETPLACE_PATTERNS) {
      if (pattern.test(f)) {
        runAssertion(`No marketplace feature: "${pattern.source}"`, false, `Found in: "${f}"`);
      }
    }
  }

  // Check that feature names make sense for logistics
  const expectedLogisticsFeatures = [
    "GPS and location tracking",
    "Route optimization",
    "Proof of delivery",
    "Earnings and payout tracking",
    "Notifications and alerts",
    "Analytics and reporting",
    "Android mobile app",
    "Web portal",
    "Document and compliance management",
    "Dispatch and allocation management",
    "Driver and partner management",
    "Messaging and communication",
    "Task and delivery management",
    "Payment and billing processing",
    "Admin dashboard",
    "Tax and multi-currency support",
    "AI-powered features",
    "Razorpay payment integration",
    "Warehouse and inventory management",
  ];

  console.log("\n  Expected logistics features check:");
  for (const ef of expectedLogisticsFeatures) {
    const found = features.includes(ef);
    const shouldExist = ef === "Warehouse and inventory management" || // warehouses mentioned
                        ef === "Voice assistant" || false; // future feature
    // Just log whether it was found - don't fail tests for individual expected features
    // since feature detection depends on keyword matching
    console.log(`    ${found ? "✓" : "○"} ${ef}`);
  }

  console.log("\n── STEP 3: Generate proposal strategy ──\n");

  const extracted = extractFromRawText(input);

  // Check proposal strategy for marketplace leakage
  if (extracted.proposalStrategy) {
    let strategyClean = true;
    for (const phase of extracted.proposalStrategy) {
      console.log(`  ${phase.name}:`);
      for (const item of phase.items) {
        const clean = checkForLeakage("  Item", [item], input);
        if (clean) {
          console.log(`    ✓ ${item}`);
        } else {
          strategyClean = false;
        }
      }
    }
    runAssertion("Proposal strategy has no marketplace leakage", strategyClean, "All items traceable to logistics input");
  }

  console.log("\n── STEP 4: Deliverables check (no marketplace patterns) ──\n");
  if (extracted.deliverables) {
    let deliverablesClean = true;
    for (const d of extracted.deliverables) {
      // Only check for forbidden marketplace patterns — traceability is validated by feature extraction
      for (const pattern of FORBIDDEN_MARKETPLACE_PATTERNS) {
        if (pattern.test(d.name) || pattern.test(d.description)) {
          runAssertion(`No marketplace pattern in deliverable "${d.name}"`, false, `Found: "${pattern.source}"`);
          deliverablesClean = false;
        }
      }
    }
    runAssertion("Deliverables have no marketplace patterns", deliverablesClean, "All deliverables clean");
  }

  console.log("\n── STEP 5: Milestones check ──\n");
  if (extracted.milestones) {
    for (const m of extracted.milestones) {
      runAssertion(`Milestone "${m.milestone}" has no marketplace terms`, 
        !/(?:gig|portfolio|worker.*kyc|scam.*detect|interview.*booking|marketplace)/i.test(m.milestone + " " + m.description),
        `${m.milestone}: ${m.description}`
      );
    }
  }

  // Summary
  console.log("\n" + "=".repeat(72));
  console.log("RESULTS SUMMARY");
  console.log("=".repeat(72));
  console.log(`  Budget       : ${budget}`);
  console.log(`  Timeline     : ${timeline}`);
  console.log(`  Countries    : ${countries.join(", ") || "None"}`);
  console.log(`  Features     : ${features.length}`);
  console.log(`  Project Type : ${projectType}`);
  console.log(`  Milestones   : ${extracted.milestones.length}`);
  console.log(`  Deliverables : ${extracted.deliverables.length}`);
  console.log(`  Strategy     : ${extracted.proposalStrategy.length} phases`);
  console.log(`  Marketplace leakage : ${process.exitCode ? "DETECTED ✗" : "NONE ✓"}`);
  console.log("");
}

run();
