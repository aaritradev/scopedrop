import type { GeneratedBrief, ExtractionWarning, ConsistencyViolation, EntityEntry, EntitySource, DiagnosticInfo, AnalysisArtifact } from "@/types/brief";
import { EntityRegistry, computeDomainConfidence, computeConsistencyScore } from "./entityRegistry";
import { buildAnalysisArtifact } from "./analysisArtifact";
import { normalizeBriefMetrics } from "./scoreUtils";
import { buildProposalReadinessIntelligence } from "./proposalReadinessIntelligence";
import { AsyncLocalStorage } from "node:async_hooks";

// â”€â”€â”€ Logging â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type LogEntry = {
  stage: string;
  message: string;
  ts: number;
  data?: unknown;
};

type PipelineContext = {
  parserLog: LogEntry[];
  registry: EntityRegistry;
  lastDiagnostics: DiagnosticInfo | null;
  rawInput: string;
  fallbackActivations: string[];
  regenerationTriggers: string[];
  extractionWarnings: ExtractionWarning[];
  consistencyViolations: ConsistencyViolation[];
  unsupportedConcepts: EntityEntry[];
  analysisInputs: Record<string, unknown>;
  finalReportInputs: Record<string, unknown>;
  analysisArtifact: AnalysisArtifact | null;
};

const pipelineContext = new AsyncLocalStorage<PipelineContext>();
let parserLog: LogEntry[] = [];
let _lastFallbackActivations: string[] = [];
let _lastRegenerationTriggers: string[] = [];
let _lastExtractionWarnings: ExtractionWarning[] = [];
let _lastConsistencyViolations: ConsistencyViolation[] = [];
let _lastUnsupportedConcepts: EntityEntry[] = [];
let _lastAnalysisInputs: Record<string, unknown> = {};
let _lastFinalReportInputs: Record<string, unknown> = {};

function activeContext(): PipelineContext | undefined {
  return pipelineContext.getStore();
}

function createPipelineContext(rawInput: string): PipelineContext {
  return {
    parserLog: [],
    registry: new EntityRegistry(),
    lastDiagnostics: null,
    rawInput,
    fallbackActivations: [],
    regenerationTriggers: [],
    extractionWarnings: [],
    consistencyViolations: [],
    unsupportedConcepts: [],
    analysisInputs: {},
    finalReportInputs: {},
    analysisArtifact: null,
  };
}

function log(stage: string, message: string, data?: unknown) {
  const entry: LogEntry = { stage, message, ts: Date.now(), data };
  const ctx = activeContext();
  if (ctx) ctx.parserLog.push(entry);
  else parserLog.push(entry);
  console.log(`[GenerateBrief:${stage}] ${message}`, data ?? "");
}

function resetLog() {
  const ctx = activeContext();
  if (ctx) ctx.parserLog = [];
  else parserLog = [];
}

export function getParserLog(): LogEntry[] {
  const ctx = activeContext();
  return ctx ? [...ctx.parserLog] : [...parserLog];
}

// â”€â”€â”€ Entity Registry (per-request) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let _registry: EntityRegistry | null = null;

export function getEntityRegistry(): EntityEntry[] | null {
  const ctx = activeContext();
  if (ctx) return ctx.registry.getAll();
  return _registry ? _registry.getAll() : null;
}

function resetRegistry() {
  const ctx = activeContext();
  if (ctx) ctx.registry = new EntityRegistry();
  else _registry = new EntityRegistry();
}

function reg(): EntityRegistry {
  const ctx = activeContext();
  if (ctx) return ctx.registry;
  if (!_registry) _registry = new EntityRegistry();
  return _registry;
}

// â”€â”€â”€ Diagnostics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let _lastDiagnostics: DiagnosticInfo | null = null;

export function getDiagnostics(): DiagnosticInfo | null {
  const ctx = activeContext();
  if (ctx) return ctx.lastDiagnostics;
  return _lastDiagnostics;
}

function recordFallbackActivation(reason: string, data?: unknown): void {
  const ctx = activeContext();
  if (ctx) ctx.fallbackActivations.push(reason);
  else _lastFallbackActivations.push(reason);
  log("fallback", reason, data);
}

function recordRegenerationTrigger(reason: string): void {
  const ctx = activeContext();
  if (ctx) ctx.regenerationTriggers.push(reason);
  else _lastRegenerationTriggers.push(reason);
}

function recordExtractionWarnings(warnings: ExtractionWarning[]): void {
  const ctx = activeContext();
  if (ctx) ctx.extractionWarnings = warnings;
  else _lastExtractionWarnings = warnings;
}

function recordConsistencyViolations(violations: ConsistencyViolation[]): void {
  const ctx = activeContext();
  if (ctx) ctx.consistencyViolations = violations;
  else _lastConsistencyViolations = violations;
}

function recordUnsupportedConcepts(concepts: EntityEntry[]): void {
  const ctx = activeContext();
  if (ctx) ctx.unsupportedConcepts = concepts;
  else _lastUnsupportedConcepts = concepts;
}

function recordAnalysisInputs(inputs: Record<string, unknown>): void {
  const ctx = activeContext();
  if (ctx) ctx.analysisInputs = { ...ctx.analysisInputs, ...inputs };
  else _lastAnalysisInputs = { ..._lastAnalysisInputs, ...inputs };
}

function recordFinalReportInputs(inputs: Record<string, unknown>): void {
  const ctx = activeContext();
  if (ctx) ctx.finalReportInputs = { ...ctx.finalReportInputs, ...inputs };
  else _lastFinalReportInputs = { ..._lastFinalReportInputs, ...inputs };
}

function recordAnalysisArtifact(artifact: AnalysisArtifact): void {
  const ctx = activeContext();
  if (ctx) ctx.analysisArtifact = artifact;
  recordAnalysisInputs({ analysisArtifact: artifact });
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function isFieldPresent(value: unknown): boolean {
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

function countExtractedFields(brief: GeneratedBrief): { total: number; present: number; missing: string[]; warnings: ExtractionWarning[] } {
  const fields: Array<{ name: string; check: () => boolean }> = [
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
    { name: "projectDecision", check: () => brief.projectDecision?.action && brief.projectDecision.action !== "Discovery Call Required" ? true : !!(brief.projectDecision?.reasoning && !/lacks sufficient detail/i.test(brief.projectDecision.reasoning)) },
    { name: "clientResponseDraft", check: () => isFieldPresent(brief.clientResponseDraft) && !/requesting a brief/i.test(brief.clientResponseDraft) },
  ];

  let present = 0;
  const missing: string[] = [];
  const warnings: ExtractionWarning[] = [];

  for (const { name, check } of fields) {
    try {
      if (check()) {
        present++;
        warnings.push({ field: name, status: "ok", message: "Detected" });
      } else {
        missing.push(name);
        warnings.push({ field: name, status: "missing", message: `Not found in input â€” marked for clarification` });
      }
    } catch {
      missing.push(name);
      warnings.push({ field: name, status: "missing", message: "Error checking field" });
    }
  }

  return { total: fields.length, present, missing, warnings };
}

function extractBudget(rawInput: string): string {
  const patterns = [
    /(?:budget|spend|cost|price)\s*(?:is|:|of)?\s*(?:around|approx|about)?\s*(?:₹|â‚¹|rs\.?|inr|usd|\$)?\s*([\d,]+(?:\.\d+)?(?:\s*(?:crores?|cr|lakhs?|l|k|million|thousand|billion))?)/i,
    /(?:₹|â‚¹|rs\.?|inr|usd|\$)\s*([\d,]+(?:\.\d+)?(?:\s*(?:crores?|cr|lakhs?|l|k|million|thousand|billion))?)/i,
    /\b(\d+(?:\.\d+)?)\s*(crores?|cr|lakhs?|l|million|thousand|billion)\b/i,
  ];
  for (const pattern of patterns) {
    const m = rawInput.match(pattern);
    if (m) {
      reg().add("budget", m[0].trim(), "budget", "client_input", 0.9, `Matched budget pattern: ${pattern.source}`);
      return m[0].trim();
    }
  }
  return "Not Specified";
}

function extractTimeline(rawInput: string): string {
  const text = rawInput.toLowerCase();
  const patterns = [
    /(?:timeline|deadline)\s*(?:is|:)?\s*(\d+\s*(?:week|month|day|year)s?)/i,
    /(\d+\s*(?:week|month|day|year)s?)\s*(?:timeline|deadline)/i,
    /(?:deliver|launch|complete)\s*(?:by|in|within|of)?\s*(\d+\s*(?:week|month|day|year)s?)/i,
    /\b(\d+)\s*(month|week)\s/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      reg().add("timeline", m[0].trim(), "timeline", "client_input", 0.85, `Matched timeline pattern`);
      return m[0].trim();
    }
  }
  return "Not Specified";
}

function extractFinanceValue(rawInput: string): string {
  const budget = extractBudget(rawInput);
  if (budget !== "Not Specified") return budget;
  return "Not Specified";
}

function extractCountries(rawInput: string): string[] {
  const text = rawInput.toLowerCase();
  const result: string[] = [];
  if (/\b(?:india|indian)\b/i.test(text)) { result.push("India"); reg().add("country_india", "India", "country", "client_input", 0.95, "Keyword 'india' in input"); }
  if (/\b(?:uae|dubai|emirates|united arab emirates)\b/i.test(text)) { result.push("UAE"); reg().add("country_uae", "UAE", "country", "client_input", 0.95, "Keyword 'uae' or 'dubai' in input"); }
  if (/\b(?:uk|united kingdom|britain|england)\b/i.test(text)) { result.push("UK"); reg().add("country_uk", "UK", "country", "client_input", 0.95, "Keyword 'uk' in input"); }
  if (/\b(?:usa|united states|america|us)\b/i.test(text)) { result.push("USA"); reg().add("country_usa", "USA", "country", "client_input", 0.95, "Keyword 'usa' or 'united states' in input"); }
  return result;
}

function registerAnalysisArtifact(artifact: AnalysisArtifact): void {
  const classificationSource = artifact.domainProfile.industry.source === "fallback" ? "generated" : artifact.domainProfile.industry.source;
  reg().add(
    "projectType",
    artifact.domainProfile.industry.value,
    "classification",
    classificationSource,
    artifact.domainProfile.industry.confidence,
    artifact.domainProfile.industry.evidence.join(" | ") || "Evidence-first domain extraction",
  );

  artifact.requirements.forEach((requirement, index) => {
    reg().add(
      `artifact_requirement_${index}`,
      requirement.value,
      "feature",
      requirement.source,
      requirement.confidence,
      requirement.evidence.join(" | "),
    );
  });

  artifact.actors.forEach((actor, index) => {
    reg().add(`artifact_actor_${index}`, actor.value, "actor", actor.source, actor.confidence, actor.evidence.join(" | "));
  });

  artifact.workflows.forEach((workflow, index) => {
    reg().add(`artifact_workflow_${index}`, workflow.value, "workflow", workflow.source, workflow.confidence, workflow.evidence.join(" | "));
  });

  artifact.complianceSignals.forEach((signal, index) => {
    reg().add(`artifact_compliance_${index}`, signal.value, "compliance", signal.source, signal.confidence, signal.evidence.join(" | "));
  });
}

// â”€â”€â”€ System Prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SYSTEM_PROMPT = `You extract project analysis from client messages into JSON.

RULES:
- Only use information explicitly stated in the client message.
- For any field where the client message does not provide enough information: use exactly "Not Specified" for strings, empty arrays [] for lists, "Unknown" for other values. Never invent details.
- Keep existing report sections complete and useful. If a recommendation is needed but not stated by the client, label it as recommended or assumed rather than presenting it as client-provided fact.
- Prioritize discovery questions as CRITICAL, IMPORTANT, or OPTIONAL based on proposal risk.
- Return ONLY valid JSON. No preamble, no markdown, no explanation.
- Every field in the schema below must be present in your output.

Schema:

{
  "projectTitle": "...",
  "clientName": "...",
  "projectSummary": "...",
  "executiveSummary": "...",
  "objectives": ["..."],
  "scopeIncluded": ["..."],
  "scopeExcluded": ["..."],
  "assumptions": ["..."],
  "deliverables": [{ "name": "...", "description": "...", "format": "...", "duePhase": "..." }],
  "timeline": [{ "milestone": "...", "description": "...", "estimatedDays": 0 }],
  "paymentTerms": { "estimatedBudget": "...", "deposit": "...", "milestonePayments": ["..."], "finalPayment": "...", "structureLabel": "Recommended Payment Structure|Payment Structure" },
  "nextSteps": ["..."],
  "redFlags": ["..."],
  "confidenceScore": 0,
  "confidenceReason": "...",
  "discoveryQuestions": [{ "question": "...", "context": "...", "priority": "CRITICAL|IMPORTANT|OPTIONAL" }],
  "risks": [{ "risk": "...", "severity": "low|medium|high", "mitigation": "...", "priority": "CRITICAL|IMPORTANT|OPTIONAL" }],
  "scopeCreepWarnings": [{ "warning": "...", "why": "..." }],
  "missingRequirements": [{ "requirement": "...", "priority": "CRITICAL|IMPORTANT|OPTIONAL", "whyItMatters": "...", "proposalImpact": "..." }],
  "upsellOpportunities": [{ "service": "...", "rationale": "..." }],
  "effortAnalysis": { "complexity": "Low|Medium|High|Very High", "breakdown": ["..."] },
  "proposalReadinessBreakdown": { "requirements": { "score": 0, "missing": ["..."] }, "technical": { "score": 0, "missing": ["..."] }, "business": { "score": 0, "missing": ["..."] }, "budget": { "score": 0, "missing": ["..."] }, "overallReadiness": 0, "explanation": "..." },
  "numericalValidation": { "isValid": true, "warnings": ["..."] },
  "budgetRealityCheck": { "estimatedMarketCost": "...", "clientBudget": "...", "gap": "...", "recommendation": "..." },
  "proposalStrategy": [{ "name": "...", "items": ["..."] }],
  "dealKillers": ["..."],
  "clientRiskScore": { "level": "Low|Medium|High", "explanation": "..." },
  "pricingGuidance": { "suggestedFixedPrice": "...", "suggestedHourlyEquivalent": "...", "suggestedMVPPrice": "...", "suggestedRetainerOpportunity": "...", "confidence": "High|Medium|Low", "confidenceReason": "..." },
  "profitabilityScore": { "score": 0, "pros": ["..."], "cons": ["..."], "explanation": "..." },
  "negotiationStrategy": { "recommendedPosition": "...", "avoid": "...", "talkingPoints": ["..."] },
  "clientTypeClassification": { "type": "...", "buyingBehavior": "...", "riskProfile": "...", "decisionSpeed": "...", "scopeChangeLikelihood": "..." },
  "projectFailureRisk": { "level": "Low|Medium|High", "factors": ["..."], "explanation": "..." },
  "projectDecision": { "action": "Accept|Accept with Conditions|Discovery Call Required|Renegotiate Scope|Decline", "reasoning": "..." },
  "clientResponseDraft": "...",
  "proposalReadySummary": { "projectOverview": "...", "likelyDeliverables": ["..."], "timelineRecommendation": "...", "pricingRecommendation": "...", "majorAssumptions": ["..."], "suggestedEngagementApproach": "..." },
  "clientWinProbability": { "probability": 0, "reasoning": "...", "positiveIndicators": ["..."], "concerns": ["..."], "negotiationAdvice": "..." },
  "clientSeriousnessScore": { "score": 0, "explanation": "...", "signals": ["..."] }
}
`;

// â”€â”€â”€ JSON Repair â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function repairJSON(text: string): string {
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

function parseWithRepair(text: string): GeneratedBrief | null {
  try { const p = JSON.parse(text) as GeneratedBrief; log("parse", "Direct JSON parse succeeded"); return p; }
  catch (err) { log("parse", "Direct parse failed", { error: String(err) }); }
  const repaired = repairJSON(text);
  try { const p = JSON.parse(repaired) as GeneratedBrief; log("parse", "Repair + parse succeeded"); return p; }
  catch (err) { log("parse", "Repair + parse failed", { error: String(err) }); }
  try {
    const objMatch = repaired.match(/\{[\s\S]*\}/);
    if (objMatch) { const p = JSON.parse(objMatch[0]) as GeneratedBrief; log("parse", "Object extraction + parse succeeded"); return p; }
  } catch { log("parse", "Object extraction failed"); }
  return null;
}

// â”€â”€â”€ Generic Fallback (last resort only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function createFallbackBrief(rawInput: string): GeneratedBrief {
  recordFallbackActivation("Creating generic fallback brief", { inputLength: rawInput.length });
  const truncated = rawInput.length > 500 ? rawInput.slice(0, 500) + "..." : rawInput;
  return {
    projectTitle: "Project Brief",
    clientName: "Client",
    projectSummary: truncated,
    executiveSummary: "The input was too ambiguous to generate a full structured brief.",
    objectives: ["Requires Clarification"],
    scopeIncluded: ["Requires Clarification"],
    scopeExcluded: ["Not Specified"],
    assumptions: ["Information is limited â€” further clarification needed"],
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
    effortAnalysis: { complexity: "Medium", breakdown: ["Cannot estimate â€” requirements are unclear"] },
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
    clientTypeClassification: { type: "Startup", buyingBehavior: "Unknown â€” insufficient data", riskProfile: "Unknown", decisionSpeed: "Unknown", scopeChangeLikelihood: "Unknown" },
    projectFailureRisk: { level: "High", factors: ["No defined scope", "No budget", "No timeline"], explanation: "The risk cannot be properly assessed, but the lack of information itself is a major risk factor" },
    projectDecision: { action: "Discovery Call Required", reasoning: "The input lacks sufficient detail to make a project decision." },
    clientResponseDraft: "Thank you for reaching out. To provide an accurate proposal, I would like to understand your project requirements in more detail.",
    extractionWarnings: [],
  };
}

// â”€â”€â”€ Smart Extraction (returns full brief subset with all detected data) â”€â”€â”€â”€

function extractFromRawText(rawInput: string): Partial<GeneratedBrief> {
  log("fallback", "Attempting extraction from raw text");

  const artifact = buildAnalysisArtifact(rawInput);
  recordAnalysisArtifact(artifact);
  registerAnalysisArtifact(artifact);

  const budget = extractBudget(rawInput);
  const timeline = extractTimeline(rawInput);
  const countries = extractCountries(rawInput);
  const evidenceRequirements = artifact.requirements.map(requirement => requirement.value);
  const features = evidenceRequirements;
  const projectType = artifact.domainProfile.industry.source !== "fallback" ? artifact.domainProfile.industry.value : "Domain requires clarification";
  const finance = extractFinanceValue(rawInput);

  const warnings: ExtractionWarning[] = [];
  if (budget !== "Not Specified") warnings.push({ field: "budget", status: "ok", message: `Detected: ${budget}` });
  else warnings.push({ field: "budget", status: "missing", message: "No budget mentioned in input" });
  if (timeline !== "Not Specified") warnings.push({ field: "timeline", status: "ok", message: `Detected: ${timeline}` });
  else warnings.push({ field: "timeline", status: "missing", message: "No timeline mentioned in input" });
  if (features.length > 0) warnings.push({ field: "features", status: "ok", message: `${features.length} features detected` });
  else warnings.push({ field: "features", status: "missing", message: "No features detected" });
  if (countries.length > 0) warnings.push({ field: "countries", status: "ok", message: `Countries: ${countries.join(", ")}` });
  if (artifact.domainProfile.industry.source !== "fallback") warnings.push({ field: "projectType", status: "ok", message: `Type: ${projectType}` });
  else warnings.push({ field: "projectType", status: "partial", message: "Could not determine domain from source evidence" });

  log("EXTRACTED_DATA", "Raw text extraction complete", {
    budget, timeline, countries, featuresCount: features.length, projectType,
    artifactDomain: artifact.domainProfile.industry,
    artifactRequirements: artifact.requirements,
    artifactActors: artifact.actors,
    artifactWorkflows: artifact.workflows,
    artifactUncertainty: artifact.diagnostics.uncertainty,
    warnings: warnings.filter(w => w.status !== "ok").map(w => `${w.field}: ${w.message}`),
  });
  recordAnalysisInputs({
    extractedBudget: budget,
    extractedTimeline: timeline,
    extractedCountries: countries,
    extractedFeatures: features,
    extractedIndustryDomain: projectType,
    extractedRequirements: features,
    artifactDomainProfile: artifact.domainProfile,
    artifactRequirements: artifact.requirements,
    artifactActors: artifact.actors,
    artifactWorkflows: artifact.workflows,
    artifactComplianceSignals: artifact.complianceSignals,
    classificationConfidence: reg().get("classification", "projectType")?.attribution.confidence ?? 0,
  });

  // Build title from budget/timeline/type
  let title = "Project Brief";
  const titlePrefixMatch = rawInput.match(/(?:project|platform|app|system|website)\s+(?:called|named|for|is)\s+[""]?/i);
  if (titlePrefixMatch && titlePrefixMatch.index !== undefined) {
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

  // Build objectives from evidence-backed requirements
  const objectives = features.length > 0
    ? features.slice(0, 5).map(f => `Deliver ${f}`)
    : ["Clarify the primary business workflows before defining objectives"];

  // Build timeline from extracted timeline text
  const timelineDays = (() => {
    const m = timeline.match(/(\d+)/);
    if (m) {
      const num = parseInt(m[1]);
      if (/month/i.test(timeline)) return num * 30;
      if (/week/i.test(timeline)) return num * 7;
      if (/day/i.test(timeline)) return num;
      if (/year/i.test(timeline)) return num * 365;
      return num * 30; // assume months
    }
    return 0;
  })();

  const milestones: Array<{ milestone: string; description: string; estimatedDays: number }> = [];
  if (timelineDays > 0) {
    const phaseDays = Math.round(timelineDays / 3);
    const f = features;
    const third = Math.ceil(f.length / 3);
    milestones.push({
      milestone: "Phase 1 â€” Foundation",
      description: f.length > 0 ? f.slice(0, third).join(", ") : "Confirm source-backed requirements and user roles",
      estimatedDays: phaseDays,
    });
    milestones.push({
      milestone: "Phase 2 â€” Core",
      description: f.length > third ? f.slice(third, 2 * third).join(", ") : "Implement confirmed priority workflows",
      estimatedDays: phaseDays,
    });
    milestones.push({
      milestone: "Phase 3 â€” Complete",
      description: f.length > 2 * third ? f.slice(2 * third).join(", ") : "Validate, test, and prepare launch",
      estimatedDays: phaseDays,
    });
  } else {
    milestones.push({ milestone: "Discovery & Planning", description: "Clarify industry, actors, workflows, constraints, and acceptance criteria", estimatedDays: 0 });
  }

  // Build deliverables from features
  const deliverableNames = features.length > 0
    ? features.filter(f => !f.includes("integration")).slice(0, 6)
    : ["Requirements clarification workshop"];
  const deliverables = deliverableNames.map((name, i) => ({
    name,
    description: `Implementation scope for: ${name}`,
    format: artifact.systems.length > 0 ? artifact.systems.map(system => system.value).join(" / ") : "Format to be confirmed",
    duePhase: i < 3 ? "Phase 1" : i < 5 ? "Phase 2" : "Phase 3",
  }));

  // Build budget reality check (derived from features count, not project type)
  const estimatedMarketCost = features.length > 8 ? "â‚¹50Lâ€“â‚¹90L range" : features.length > 4 ? "â‚¹30Lâ€“â‚¹55L range" : "â‚¹15Lâ€“â‚¹35L range";
  const budgetRealityCheck = (() => {
    if (budget !== "Not Specified") {
      return {
        estimatedMarketCost,
        clientBudget: budget,
        gap: "Requires detailed scoping to confirm alignment",
        recommendation: `Client budget is ${budget}. Recommend MVP-first approach with phased delivery to align budget and scope.`,
      };
    }
    return {
      estimatedMarketCost,
      clientBudget: "Not specified",
      gap: "Cannot calculate â€” budget not provided",
      recommendation: "Request budget range before proceeding with detailed proposal.",
    };
  })();

  // Build pricing guidance
  const pricingGuidance = (() => {
    if (budget !== "Not Specified") {
      return {
        suggestedFixedPrice: budget,
        suggestedHourlyEquivalent: "â‚¹1,500â€“â‚¹3,000/hr estimated",
        suggestedMVPPrice: Math.round(parseInt(budget.replace(/[^\d]/g, "")) * 0.4).toString() + " (40% of budget for MVP)",
        suggestedRetainerOpportunity: "â‚¹50,000â€“â‚¹1,50,000/mo for ongoing maintenance and support",
        confidence: "Medium" as const,
        confidenceReason: `Budget detected: ${budget}. Timeline: ${timeline}. Confidence is medium because full scope details are still unclear.`,
      };
    }
    return {
      suggestedFixedPrice: "Cannot estimate",
      suggestedHourlyEquivalent: "Cannot estimate",
      suggestedMVPPrice: "Cannot estimate",
      suggestedRetainerOpportunity: "Cannot estimate",
      confidence: "Low" as const,
      confidenceReason: "No budget information provided. Pricing guidance requires budget context.",
    };
  })();

  // Build risks
  const risks: Array<{ risk: string; severity: "low" | "medium" | "high"; mitigation: string; priority: "CRITICAL" | "IMPORTANT" | "OPTIONAL" }> = [];
  if (budget === "Not Specified") {
    risks.push({ risk: "Budget not specified", severity: "high", mitigation: "Request budget range before committing to scope", priority: "CRITICAL" });
  } else {
    risks.push({ risk: `Budget may be tight at ${budget} for full feature set`, severity: "medium", mitigation: "Propose MVP-first approach with phased delivery", priority: "IMPORTANT" });
  }
  if (countries.length > 1) {
    risks.push({ risk: `Multi-country launch (${countries.join(", ")}) adds compliance complexity`, severity: "medium", mitigation: "Research regulatory requirements (GDPR, data residency, payment regulations) for each market", priority: "IMPORTANT" });
  }
  if (features.length > 8) {
    risks.push({ risk: `${features.length} features requested â€” high scope complexity`, severity: "medium", mitigation: "Prioritize features and defer non-critical to later phases", priority: "IMPORTANT" });
  }
  for (const artifactRisk of artifact.risks) {
    risks.push({
      risk: artifactRisk.value,
      severity: artifactRisk.severity,
      mitigation: artifactRisk.mitigation || "Clarify this risk during discovery before committing to scope",
      priority: artifactRisk.severity === "high" ? "CRITICAL" : "IMPORTANT",
    });
  }
  if (/(?:mobile|ios|android)/i.test(rawInput) && /(?:web|website)/i.test(rawInput)) {
    risks.push({ risk: "Multi-platform (iOS + Android + Web) increases development effort 2-3x", severity: "high", mitigation: "Use cross-platform framework (Flutter, React Native) or phase platform launches", priority: "CRITICAL" });
  }
  if (risks.length === 0) {
    risks.push({ risk: "Project scope is undefined", severity: "high", mitigation: "Schedule a discovery call to define scope", priority: "CRITICAL" });
  }

  // Build discovery questions
  const questions: Array<{ question: string; context: string; priority: "CRITICAL" | "IMPORTANT" | "OPTIONAL" }> = [];
  if (budget === "Not Specified") {
    questions.push({ question: "What is your budget range for this project?", context: "Budget determines the feasible scope and timeline", priority: "CRITICAL" });
  }
  if (timeline === "Not Specified") {
    questions.push({ question: "What is your desired timeline or launch date?", context: "Timeline affects resource planning and delivery approach", priority: "CRITICAL" });
  }
  if (features.length > 0) {
    questions.push({ question: `Which of the ${features.length} extracted requirements are must-haves for the first release?`, context: "Prioritization should use source-backed requirements rather than generic feature assumptions", priority: "CRITICAL" });
  }
  if (artifact.actors.length === 0) {
    questions.push({ question: "Who are the primary user roles and decision-makers for this system?", context: "Role clarity is required before access control, workflows, and deliverables can be scoped", priority: "CRITICAL" });
  }
  if (artifact.workflows.length === 0) {
    questions.push({ question: "Which operational workflows should the system support from start to finish?", context: "Workflow evidence is needed to avoid generic platform assumptions", priority: "CRITICAL" });
  }
  if (artifact.complianceSignals.length > 0) {
    questions.push({ question: "Which compliance, audit, approval, privacy, or data-handling requirements are mandatory?", context: "The brief contains compliance signals that may affect architecture and delivery risk", priority: "IMPORTANT" });
  }
  if (countries.length > 0) {
    questions.push({ question: `For the ${countries.join(", ")} launch, what compliance requirements apply (data residency, payment regulations)?`, context: "Multi-country launches have significant compliance implications", priority: "IMPORTANT" });
  }

  // Build client risk score
  const clientRiskLevel: "Low" | "Medium" | "High" = (() => {
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
  const failureFactors: string[] = [];
  if (budget === "Not Specified") failureFactors.push("Budget not specified");
  if (timeline === "Not Specified") failureFactors.push("Timeline not specified");
  if (countries.length > 1) failureFactors.push(`Multi-country compliance requirements (${countries.join(", ")})`);
  if (features.length > 10) failureFactors.push(`Large feature set (${features.length} features)`);
  if (failureFactors.length === 0) failureFactors.push("Requires further scoping to identify risks");

  // Build project decision
  const decisionAction = (() => {
    if (budget !== "Not Specified" && timeline !== "Not Specified" && features.length > 3) return "Accept with Conditions" as const;
    if (budget !== "Not Specified" || timeline !== "Not Specified" || features.length > 3) return "Discovery Call Required" as const;
    return "Discovery Call Required" as const;
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
      draft += ". We recommend approaching this with a phased delivery approach to ensure delivery quality and budget alignment.";
    } else {
      draft += " We would love to better understand your budget range and desired timeline before preparing a proposal.";
    }
    draft += " Would it be possible to schedule a discovery call to discuss the requirements in more detail?";
    return draft;
  })();

  log("ANALYSIS_INPUT", "Extraction data passed to analysis", {
    budget, timeline, countries, featuresCount: features.length, projectType,
    milestonesCount: milestones.length,
    deliverablesCount: deliverables.length,
    risksCount: risks.length,
    questionsCount: questions.length,
    clientRiskLevel,
    decisionAction,
  });
  recordAnalysisInputs({
    projectType,
    budget,
    timeline,
    countries,
    features,
    milestonesCount: milestones.length,
    deliverablesCount: deliverables.length,
    risksCount: risks.length,
    questionsCount: questions.length,
    clientRiskLevel,
    decisionAction,
  });

  const briefResult: Partial<GeneratedBrief> = {
    projectTitle: title,
    projectSummary: rawInput.length > 300 ? rawInput.slice(0, 300) + "..." : rawInput,
    executiveSummary: `${artifact.domainProfile.industry.source !== "fallback" ? `A ${projectType.toLowerCase()} project was described` : "The project domain needs clarification"} targeting ${countries.length > 0 ? countries.join(", ") : "one or more markets"}. ${budget !== "Not Specified" ? `Budget: ${budget}. ` : ""}${timeline !== "Not Specified" ? `Timeline: ${timeline}. ` : ""}${features.length > 0 ? `${features.length} source-backed requirements extracted.` : "No concrete requirements extracted."}`,
    objectives,
    scopeIncluded: features.length > 0 ? features : ["Requires Clarification"],
    scopeExcluded: (() => {
      const excl: string[] = [];
      if (features.length > 0) excl.push("Features not explicitly listed in the initial scope");
      if (/(?:cross.?platform|mobile.*web|web.*mobile)/i.test(rawInput)) excl.push("Full cross-platform parity from day one");
      if (excl.length === 0) excl.push("Scope to be defined during discovery call");
      return excl;
    })(),
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
      const reqs: Array<{ requirement: string; priority: "CRITICAL" | "IMPORTANT" | "OPTIONAL" }> = [];
      if (budget === "Not Specified") reqs.push({ requirement: "Budget and payment terms", priority: "CRITICAL" });
      if (timeline === "Not Specified") reqs.push({ requirement: "Timeline and launch deadlines", priority: "CRITICAL" });
      reqs.push({ requirement: "Technical architecture decisions (backend, hosting, database)", priority: "IMPORTANT" });
      reqs.push({ requirement: "UI/UX design requirements and brand guidelines", priority: "IMPORTANT" });
      if (countries.length > 0) reqs.push({ requirement: `Compliance requirements for ${countries.join(", ")} markets`, priority: "IMPORTANT" });
      if (artifact.complianceSignals.length > 0) reqs.push({ requirement: "Compliance, approval, privacy, and access-control details", priority: "IMPORTANT" });
      return reqs;
    })(),
    upsellOpportunities: (() => {
      const items: Array<{ service: string; rationale: string }> = [];
      if (artifact.complianceSignals.length > 0) items.push({ service: "Compliance discovery and controls mapping", rationale: "Compliance signals appeared in the source brief and need explicit scoping before implementation" });
      if (artifact.systems.length > 0) items.push({ service: "Systems integration scoping", rationale: `The brief references ${artifact.systems.map(system => system.value).join(", ")}, which may require integration planning` });
      if (items.length === 0 && features.length > 0) items.push({ service: "Post-launch support for confirmed workflows", rationale: "Support should be scoped around the source-backed workflows after launch" });
      if (items.length === 0) items.push({ service: "Discovery and scoping workshop", rationale: "Detailed requirements gathering and technical feasibility assessment" });
      return items;
    })(),
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
      const phases: Array<{ name: string; items: string[] }> = [];
      const f = features;
      if (f.length === 0) {
        return [{
          name: "Discovery",
          items: [
            "Confirm industry context, user roles, workflows, constraints, and acceptance criteria from the client",
            "Convert clarified requirements into a source-backed implementation plan",
          ],
        }];
      }
      const third = Math.ceil(f.length / 3);
      phases.push({
        name: "Phase 1 — Source-backed foundation",
        items: f.slice(0, third),
      });
      if (f.length > third) phases.push({
        name: "Phase 2 — Confirmed workflow buildout",
        items: f.slice(third, 2 * third),
      });
      if (f.length > 2 * third) phases.push({
        name: "Phase 3 — Validation and launch readiness",
        items: f.slice(2 * third),
      });
      return phases;
    })(),
    dealKillers: (() => {
      const killers: string[] = [];
      if (budget === "Not Specified") killers.push("Budget not defined â€” cannot scope or price the project");
      if (timeline === "Not Specified") killers.push("Timeline not defined â€” cannot commit to delivery schedule");
      if (countries.length > 1) killers.push(`Multi-country compliance requirements (${countries.join(", ")}) must be clarified`);
      if (artifact.diagnostics.uncertainty.length > 0) killers.push(...artifact.diagnostics.uncertainty.map(item => `${item} before proposal commitment`));
      if (killers.length === 0) killers.push("No explicit deal killer found in the source brief");
      return killers.slice(0, 4);
    })(),
    clientRiskScore: { level: clientRiskLevel, explanation: (() => {
      const parts: string[] = [];
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
      ), 10);
      const pros: string[] = [];
      const cons: string[] = [];
      if (budget !== "Not Specified") pros.push(`Budget defined: ${budget}`);
      else cons.push("Budget not specified");
      if (features.length > 0) pros.push(`Clear feature set (${features.length} features)`);
      else cons.push("No features specified");
      if (countries.length > 0) pros.push(`Multi-market opportunity (${countries.join(", ")})`);
      if (features.length > 8) cons.push(`Large feature set may strain budget`);
      if (budget !== "Not Specified" && features.length > 8) cons.push(`Potential budget-scope mismatch`);
      if (pros.length === 0) pros.push("Project identified as potential opportunity");
      return { score, pros, cons, explanation: `Scored ${score}/10 based on ${features.length} source-backed requirements, ${budget !== "Not Specified" ? "budget defined" : "budget missing"}, ${timeline !== "Not Specified" ? "timeline defined" : "timeline missing"}, ${countries.length} target markets.` };
    })(),
    negotiationStrategy: {
      recommendedPosition: budget !== "Not Specified" && features.length > 3 ? "Propose a phased scope based only on source-backed requirements" : "Schedule discovery call before committing to any position",
      avoid: "Committing to unsupported features, timelines, or pricing assumptions that are not traceable to the brief",
      talkingPoints: [
        features.length > 0 ? `Anchor Phase 1 on: ${features.slice(0, Math.min(3, features.length)).join(", ")}` : "Start by confirming the highest-priority source-backed workflows",
        artifact.actors.length > 0 ? `Validate workflows with: ${artifact.actors.slice(0, 4).map(actor => actor.value).join(", ")}` : "Confirm user roles before scoping permissions and workflows",
        artifact.complianceSignals.length > 0 ? "Clarify compliance and data-handling obligations before implementation estimates" : "Separate confirmed requirements from assumptions during proposal review",
        "Keep inferred recommendations visibly labeled until the client confirms them",
      ],
    },
    clientTypeClassification: (() => {
      return {
        type: artifact.domainProfile.businessModel.value,
        buyingBehavior: "Requires clarification from stakeholder and procurement context in the source brief",
        riskProfile: budget !== "Not Specified" ? "Low to Medium â€” budget provides some certainty" : "Medium â€” budget uncertainty increases risk",
        decisionSpeed: "Unknown â€” decision process was not explicitly stated",
        scopeChangeLikelihood: artifact.diagnostics.uncertainty.length > 0 ? "Medium to High â€” domain or workflow uncertainty remains" : "Medium â€” depends on requirement confirmation",
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
        const parts: string[] = [];
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

  const structuralLabelWarnings = sanitizeStructuralLabelEntities(briefResult);
  if (structuralLabelWarnings.length > 0) {
    briefResult.extractionWarnings = [...(briefResult.extractionWarnings || []), ...structuralLabelWarnings];
    log("validation", "Rejected structural labels from extracted business entities", structuralLabelWarnings);
  }

  // Validate: check that all generated content is traceable to source input
  const valResult = validateExtractionAgainstSource(rawInput, briefResult);
  const allWarnings = [...(briefResult.extractionWarnings || []), ...valResult];

  log("ANALYSIS_INPUT", "Validation complete", {
    extractionWarnings: allWarnings.length,
    validationViolations: valResult.length,
  });
  recordExtractionWarnings(allWarnings);

  return { ...briefResult, extractionWarnings: allWarnings };
}

// â”€â”€â”€ Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function validateExtractionAgainstSource(rawInput: string, brief: Partial<GeneratedBrief>): ExtractionWarning[] {
  const violations: ExtractionWarning[] = [];
  const inputLower = rawInput.toLowerCase();

  if (brief.scopeIncluded) {
    for (const item of brief.scopeIncluded) {
      const keywords = item.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const found = keywords.some(k => inputLower.includes(k));
      if (!found && keywords.length > 0) {
        violations.push({
          field: "scopeIncluded",
          status: "partial",
          message: `"${item}" â€” no matching keywords found in source input. Possible leakage from previous request.`,
        });
      }
    }
  }

  if (brief.proposalStrategy) {
    const allFeatureWords = (brief.scopeIncluded || []).join(" ").toLowerCase();
    for (const phase of brief.proposalStrategy) {
      for (const item of phase.items) {
        const itemKeywords = item.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !["with", "from", "that", "this", "based"].includes(w));
        const found = itemKeywords.some(k => inputLower.includes(k) || allFeatureWords.includes(k));
        if (!found && itemKeywords.length > 0) {
          violations.push({
            field: "proposalStrategy",
            status: "partial",
            message: `Phase "${phase.name}" item "${item}" â€” not traceable to source input. Possible leakage.`,
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    log("validation", `Found ${violations.length} potential cross-request leakage(s)`, { violations });
  } else {
    log("validation", "All generated content is traceable to source input â€” no leakage detected");
  }

  return violations;
}

const rawSectionLabelPattern = /^(?:requirements?|we would also like|future initiatives?|timeline|budget|location|locations|scale|scope|objectives?|deliverables?|risks?|constraints?|assumptions?|users?|actors?|roles?|systems?|workflows?|processes?|dependencies?|notes?|overview|summary|background|phase\s*\d+|next steps?)$/i;

function normalizePossibleLabel(value: string): string {
  return value
    .replace(/^[-*•\d.)\s]+/, "")
    .replace(/^(?:deliver|implement|implementation of|implementation scope for|scope for)\s+/i, "")
    .replace(/[:\-–—]+$/g, "")
    .trim();
}

function isRawSectionLabelEntity(value: string): boolean {
  const normalized = normalizePossibleLabel(value);
  if (!normalized) return true;
  return rawSectionLabelPattern.test(normalized);
}

function sanitizeStructuralLabelEntities(brief: Partial<GeneratedBrief>): ExtractionWarning[] {
  const warnings: ExtractionWarning[] = [];
  const reject = (field: string, value: string) => {
    warnings.push({
      field,
      status: "partial",
      message: `"${value}" was rejected because it is a document section label, not a business entity.`,
    });
  };

  const filterStrings = (field: string, values?: string[]) => {
    if (!values) return values;
    return values.filter(value => {
      const rejected = isRawSectionLabelEntity(value);
      if (rejected) reject(field, value);
      return !rejected;
    });
  };

  brief.objectives = filterStrings("objectives", brief.objectives);
  brief.scopeIncluded = filterStrings("scopeIncluded", brief.scopeIncluded);
  brief.scopeExcluded = filterStrings("scopeExcluded", brief.scopeExcluded);
  brief.nextSteps = filterStrings("nextSteps", brief.nextSteps);
  brief.redFlags = filterStrings("redFlags", brief.redFlags);
  brief.dealKillers = filterStrings("dealKillers", brief.dealKillers);

  if (brief.deliverables) {
    brief.deliverables = brief.deliverables.filter(deliverable => {
      const rejected = isRawSectionLabelEntity(deliverable.name);
      if (rejected) reject("deliverables", deliverable.name);
      return !rejected;
    });
  }

  if (brief.proposalStrategy) {
    brief.proposalStrategy = brief.proposalStrategy
      .map(phase => ({
        ...phase,
        items: phase.items.filter(item => {
          const rejected = isRawSectionLabelEntity(item);
          if (rejected) reject("proposalStrategy", item);
          return !rejected;
        }),
      }))
      .filter(phase => phase.items.length > 0 || !isRawSectionLabelEntity(phase.name));
  }

  if (brief.risks) {
    brief.risks = brief.risks.filter(risk => {
      const rejected = isRawSectionLabelEntity(risk.risk);
      if (rejected) reject("risks", risk.risk);
      return !rejected;
    });
  }

  return warnings;
}

// â”€â”€â”€ Consistency Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function validateConsistency(brief: GeneratedBrief, rawInput: string): ConsistencyViolation[] {
  const violations: ConsistencyViolation[] = [];
  const inputLower = rawInput.toLowerCase();
  const scopeText = (brief.scopeIncluded || []).join(" ").toLowerCase();
  const allTopics = scopeText + " " + inputLower;

  // Check proposalStrategy against scopeIncluded
  if (brief.proposalStrategy && brief.proposalStrategy.length > 0) {
    for (const phase of brief.proposalStrategy) {
      for (const item of phase.items) {
        const itemWords = item.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !["with", "from", "that", "this", "based", "first", "then"].includes(w));
        if (itemWords.length > 0 && !itemWords.some(w => allTopics.includes(w))) {
          violations.push({ section: "proposalStrategy", detail: `"${item}" in phase "${phase.name}" references no detected feature or input keyword`, severity: "medium" });
        }
      }
    }
  }

  // Check risks against scope + input
  if (brief.risks && brief.risks.length > 0) {
    for (const r of brief.risks) {
      const riskWords = (r.risk + " " + r.mitigation).toLowerCase().split(/\s+/).filter(w => w.length > 4);
      if (riskWords.length > 0 && !riskWords.some(w => allTopics.includes(w))) {
        violations.push({ section: "risks", detail: `"${r.risk}" references topics not found in input`, severity: "medium" });
      }
    }
  }

  // Check upsellOpportunities against features
  if (brief.upsellOpportunities && brief.upsellOpportunities.length > 0) {
    for (const u of brief.upsellOpportunities) {
      const upsellWords = (u.service + " " + u.rationale).toLowerCase().split(/\s+/).filter(w => w.length > 4);
      if (upsellWords.length > 0 && !upsellWords.some(w => allTopics.includes(w))) {
        violations.push({ section: "upsellOpportunities", detail: `"${u.service}" has no clear relation to detected features`, severity: "low" });
      }
    }
  }

  // Check deliverables against scopeIncluded
  if (brief.deliverables && brief.deliverables.length > 0 && brief.scopeIncluded && brief.scopeIncluded.length > 0) {
    const scopeJoined = brief.scopeIncluded.join(" ").toLowerCase();
    for (const d of brief.deliverables) {
      const delivWords = d.name.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      if (delivWords.length > 0 && !delivWords.some(w => scopeJoined.includes(w) || inputLower.includes(w))) {
        violations.push({ section: "deliverables", detail: `"${d.name}" deliverable not mentioned in scope or input`, severity: "medium" });
      }
    }
  }

  // Check milestones against features
  if (brief.timeline && brief.timeline.length > 0 && brief.scopeIncluded && brief.scopeIncluded.length > 0) {
    const scopeJoined = brief.scopeIncluded.join(" ").toLowerCase();
    for (const m of brief.timeline) {
      const milestoneWords = (m.milestone + " " + m.description).toLowerCase().split(/\s+/).filter(w => w.length > 4);
      if (milestoneWords.length > 0 && !milestoneWords.some(w => scopeJoined.includes(w) || inputLower.includes(w) || /phase|foundation|core|complete|polish|testing|launch|setup/.test(w))) {
        violations.push({ section: "timeline", detail: `Milestone "${m.milestone}" not traceable to scope`, severity: "low" });
      }
    }
  }

  log("validation", `Consistency check: ${violations.length} violation(s)`, { violations: violations.map(v => `${v.section}: ${v.detail}`) });
  return violations;
}

function tokenizeConceptText(text: string): string[] {
  const stopwords = new Set([
    "about", "above", "after", "again", "against", "align", "basic", "based", "before", "build", "business",
    "client", "complete", "complexity", "core", "custom", "define", "delivery", "detail", "during", "essential",
    "feature", "features", "first", "full", "implementation", "initial", "launch", "management", "market", "module",
    "needs", "phase", "platform", "project", "provide", "requirements", "scope", "service", "system", "technical",
    "timeline", "value", "which", "without", "workflow", "workflows",
  ]);

  return Array.from(new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s/-]/g, " ")
      .split(/\s+/)
      .map(w => w.replace(/s$/, ""))
      .filter(w => w.length > 3 && !stopwords.has(w)),
  ));
}

function isDomainNeutralConcept(text: string): boolean {
  return /budget|timeline|deadline|clarification|discovery|payment|price|cost|estimate|schedule|unknown|not specified|requirements?|scoping/i.test(text);
}

function collectSectionConcepts(brief: GeneratedBrief): Array<{ section: string; value: string }> {
  const concepts: Array<{ section: string; value: string }> = [];
  (brief.objectives || []).forEach(value => concepts.push({ section: "objectives", value }));
  (brief.scopeIncluded || []).forEach(value => concepts.push({ section: "scope", value }));
  (brief.deliverables || []).forEach(value => concepts.push({ section: "deliverables", value: `${value.name} ${value.description}` }));
  (brief.risks || []).forEach(value => concepts.push({ section: "risks", value: `${value.risk} ${value.mitigation}` }));
  (brief.proposalStrategy || []).forEach(phase => phase.items.forEach(value => concepts.push({ section: "proposalStrategy", value })));
  (brief.discoveryQuestions || []).forEach(value => concepts.push({ section: "discoveryQuestions", value: `${value.question} ${value.context}` }));
  if (brief.clientTypeClassification?.type) concepts.push({ section: "classification", value: brief.clientTypeClassification.type });
  return concepts;
}

function validateDomainConsistency(brief: GeneratedBrief, rawInput: string): ConsistencyViolation[] {
  const violations: ConsistencyViolation[] = [];
  const inputTokens = new Set(tokenizeConceptText(rawInput));
  const supportedEntityTokens = new Set<string>();

  for (const entity of reg().getAll()) {
    if (entity.attribution.source === "client_input" || entity.attribution.source === "inferred") {
      tokenizeConceptText(entity.value).forEach(token => supportedEntityTokens.add(token));
    }
  }

  const supportedTokens = new Set(Array.from(inputTokens).concat(Array.from(supportedEntityTokens)));
  const classification = reg().get("classification", "projectType");

  if (classification && classification.value !== "Unknown") {
    const classificationTokens = tokenizeConceptText(classification.value);
    const classificationHasSupport =
      classification.attribution.source === "client_input" ||
      classification.attribution.source === "inferred" ||
      classificationTokens.some(token => supportedTokens.has(token));

    if (!classificationHasSupport || classification.attribution.confidence < 0.35) {
      violations.push({
        section: "classification",
        detail: `Classification "${classification.value}" has weak source support`,
        severity: "high",
      });
    }
  }

  for (const concept of collectSectionConcepts(brief)) {
    if (isDomainNeutralConcept(concept.value)) continue;

    const conceptTokens = tokenizeConceptText(concept.value);
    if (conceptTokens.length === 0) continue;

    const supported = conceptTokens.some(token => supportedTokens.has(token));
    if (!supported) {
      violations.push({
        section: concept.section,
        detail: `"${concept.value}" does not align with source or extracted domain tokens`,
        severity: concept.section === "classification" ? "high" : "medium",
      });
    }
  }

  if (violations.length > 0) {
    log("validation", `Domain consistency check found ${violations.length} violation(s)`, {
      supportedTokens: Array.from(supportedTokens).slice(0, 80),
      violations: violations.map(v => `${v.section}: ${v.detail}`),
    });
  } else {
    log("validation", "Domain consistency check passed");
  }

  return violations;
}

// â”€â”€â”€ Section-Level Regeneration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function regenerateInconsistentSections(brief: GeneratedBrief, violations: ConsistencyViolation[], rawInput: string): GeneratedBrief {
  if (violations.length === 0) return brief;

  const result = { ...brief };
  const artifact = activeContext()?.analysisArtifact;
  const artifactRequirements = artifact?.requirements.map(requirement => requirement.value) || [];
  const features = artifactRequirements;
  const scopeItems = brief.scopeIncluded || [];
  const featureNames = features.map(f => f.toLowerCase());
  const scopeNames = scopeItems.map(s => s.toLowerCase());

  // Group violations by section
  const sectionViolations = new Map<string, ConsistencyViolation[]>();
  for (const v of violations) {
    const existing = sectionViolations.get(v.section) || [];
    existing.push(v);
    sectionViolations.set(v.section, existing);
  }

  log("regeneration", `Regenerating ${violations.length} inconsistent section(s) across ${sectionViolations.size} section(s)`);

  Array.from(sectionViolations.entries()).forEach(([section, secViolations]) => {
    switch (section) {
      case "proposalStrategy": {
        // Regenerate proposal phases from scopeIncluded + features
        const newPhases: Array<{ name: string; items: string[] }> = [];
        const allItems = scopeItems.length > 0 ? scopeItems : features;
        if (allItems.length > 0) {
          const third = Math.ceil(allItems.length / 3);
          newPhases.push({
            name: "Phase 1 â€” Source-backed foundation",
            items: allItems.slice(0, third),
          });
          if (allItems.length > third) {
            newPhases.push({
              name: "Phase 2 â€” Confirmed workflow buildout",
              items: allItems.slice(third, 2 * third),
            });
          }
          if (allItems.length > 2 * third) {
            newPhases.push({
              name: "Phase 3 â€” Validation and launch readiness",
              items: allItems.slice(2 * third),
            });
          }
        }
        if (newPhases.length > 0) {
          result.proposalStrategy = newPhases;
          log("regeneration", `Regenerated proposalStrategy: ${newPhases.length} phases from ${allItems.length} scope items`);
        }
        break;
      }

      case "risks": {
        // Regenerate risks from missing data
        const newRisks: Array<{ risk: string; severity: "low" | "medium" | "high"; mitigation: string; priority: "CRITICAL" | "IMPORTANT" | "OPTIONAL" }> = [];
        const missingReqs = brief.missingRequirements || [];
        for (const req of missingReqs) {
          newRisks.push({
            risk: `${req.requirement} not yet defined`,
            severity: req.priority === "CRITICAL" ? "high" : "medium",
            mitigation: `Clarify ${req.requirement.toLowerCase()} during scoping phase`,
            priority: req.priority,
          });
        }
        if (newRisks.length > 0) {
          result.risks = newRisks;
          log("regeneration", `Regenerated risks: ${newRisks.length} from missing requirements`);
        }
        break;
      }

      case "upsellOpportunities": {
        // Regenerate from evidence-backed artifact context
        const newUpsells: Array<{ service: string; rationale: string }> = [];
        if ((artifact?.complianceSignals.length || 0) > 0) newUpsells.push({ service: "Compliance discovery and controls mapping", rationale: "Compliance signals appeared in the source brief and need explicit scoping" });
        if ((artifact?.systems.length || 0) > 0) newUpsells.push({ service: "Systems integration scoping", rationale: `The brief references ${artifact!.systems.map(system => system.value).join(", ")}, which may require integration planning` });
        if (newUpsells.length === 0 && features.length > 0) newUpsells.push({ service: "Post-launch support for confirmed workflows", rationale: "Support should be scoped around the source-backed workflows after launch" });
        if (newUpsells.length > 0) {
          result.upsellOpportunities = newUpsells;
          log("regeneration", `Regenerated upsellOpportunities: ${newUpsells.length} from features`);
        }
        break;
      }

      case "deliverables": {
        // Regenerate deliverables from scopeIncluded
        const newDeliverables: Array<{ name: string; description: string; format: string; duePhase: string }> = [];
        const items = scopeItems.length > 0 ? scopeItems : features;
        items.forEach((name, i) => {
          newDeliverables.push({
            name,
            description: `Implementation of ${name.toLowerCase()}`,
            format: "Web / Mobile",
            duePhase: i < Math.ceil(items.length / 3) ? "Phase 1" : i < Math.ceil(2 * items.length / 3) ? "Phase 2" : "Phase 3",
          });
        });
        if (newDeliverables.length > 0) {
          result.deliverables = newDeliverables;
          log("regeneration", `Regenerated deliverables: ${newDeliverables.length} from scope/features`);
        }
        break;
      }

      case "timeline": {
        // Regenerate milestones from features
        const newMilestones: Array<{ milestone: string; description: string; estimatedDays: number }> = [];
        const baseDays = brief.timeline && brief.timeline.length > 0 ? brief.timeline[0].estimatedDays || 30 : 30;
        if (features.length > 0) {
          const third = Math.ceil(features.length / 3);
          newMilestones.push({ milestone: "Phase 1 â€” Foundation", description: features.slice(0, third).join(", "), estimatedDays: baseDays });
          if (features.length > third) newMilestones.push({ milestone: "Phase 2 â€” Core", description: features.slice(third, 2 * third).join(", "), estimatedDays: baseDays });
          if (features.length > 2 * third) newMilestones.push({ milestone: "Phase 3 â€” Complete", description: features.slice(2 * third).join(", "), estimatedDays: baseDays });
        }
        if (newMilestones.length > 0) {
          result.timeline = newMilestones;
          log("regeneration", `Regenerated timeline: ${newMilestones.length} milestones from features`);
        }
        break;
      }

      default:
        log("regeneration", `No regeneration strategy for section: ${section}`);
    }
  });

  return result;
}

// â”€â”€â”€ Source Attribution Scanner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Post-hoc: scans every generated brief section and attributes each entity
// to "client_input", "inferred", or "generated" based on source traceability.

function scanAndAttributeEntities(brief: GeneratedBrief, rawInput: string): void {
  const inputLower = rawInput.toLowerCase();
  const scopeText = (brief.scopeIncluded || []).join(" ").toLowerCase();
  const allSourceText = inputLower + " " + scopeText;

  function isTraceable(text: string): boolean {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !["with", "from", "that", "this", "based", "first", "then", "than", "also", "have", "been", "were", "will", "what", "when", "where", "which"].includes(w));
    return words.length === 0 || words.some(w => allSourceText.includes(w));
  }

  function entitySource(text: string): { source: EntitySource; confidence: number } {
    if (/requires clarification|not specified|to be discussed|cannot estimate|cannot calculate|unknown|discovery call/i.test(text)) {
      return { source: "fallback", confidence: 0.2 };
    }
    if (isTraceable(text)) {
      const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const score = words.filter(w => inputLower.includes(w)).length / Math.max(1, words.length);
      if (score > 0.5) return { source: "client_input", confidence: 0.5 + score * 0.4 };
      if (score > 0) return { source: "inferred", confidence: 0.3 + score * 0.3 };
    }
    return { source: "generated", confidence: 0.15 };
  }

  // Scope included
  (brief.scopeIncluded || []).forEach((item, i) => {
    const { source, confidence } = entitySource(item);
    reg().add(`scope_${i}`, item, "scope", source, confidence);
  });

  // Scope excluded
  (brief.scopeExcluded || []).forEach((item, i) => {
    const { source, confidence } = entitySource(item);
    reg().add(`scope_excl_${i}`, item, "scope_excluded", source, confidence);
  });

  // Objectives
  (brief.objectives || []).forEach((item, i) => {
    const { source, confidence } = entitySource(item);
    reg().add(`objective_${i}`, item, "objective", source, confidence);
  });

  // Assumptions, next steps, and red flags
  (brief.assumptions || []).forEach((item, i) => {
    const { source, confidence } = entitySource(item);
    reg().add(`assumption_${i}`, item, "assumption", source, confidence);
  });
  (brief.nextSteps || []).forEach((item, i) => {
    const { source, confidence } = entitySource(item);
    reg().add(`next_step_${i}`, item, "next_step", source, confidence);
  });
  (brief.redFlags || []).forEach((item, i) => {
    const { source, confidence } = entitySource(item);
    reg().add(`red_flag_${i}`, item, "red_flag", source, confidence);
  });

  // Deliverables
  (brief.deliverables || []).forEach((d, i) => {
    const { source, confidence } = entitySource(d.name);
    reg().add(`deliverable_${i}`, d.name, "deliverable", source, confidence);
  });

  // Risks
  (brief.risks || []).forEach((r, i) => {
    const { source, confidence } = entitySource(r.risk);
    reg().add(`risk_${i}`, r.risk, "risk", source, confidence);
  });

  // Milestones
  (brief.timeline || []).forEach((t, i) => {
    const { source, confidence } = entitySource(t.milestone + " " + t.description);
    reg().add(`milestone_${i}`, t.milestone, "milestone", source, confidence);
  });

  // Discovery questions
  (brief.discoveryQuestions || []).forEach((q, i) => {
    const { source, confidence } = entitySource(q.question);
    reg().add(`question_${i}`, q.question, "discovery_question", source, confidence);
  });

  // Upsell opportunities
  (brief.upsellOpportunities || []).forEach((u, i) => {
    const { source, confidence } = entitySource(u.service);
    reg().add(`upsell_${i}`, u.service, "upsell", source, confidence);
  });

  // Missing requirements
  (brief.missingRequirements || []).forEach((m, i) => {
    const { source, confidence } = entitySource(m.requirement);
    reg().add(`missing_req_${i}`, m.requirement, "missing_requirement", source, confidence);
  });

  // Proposal strategy phases
  (brief.proposalStrategy || []).forEach((p, pi) => {
    reg().add(`phase_${pi}`, p.name, "proposal_phase", "fallback", 0.15, "Template phase name");
    p.items.forEach((item, ii) => {
      const { source, confidence } = entitySource(item);
      reg().add(`phase_${pi}_item_${ii}`, item, "proposal_item", source, confidence);
    });
  });

  // Deal killers
  (brief.dealKillers || []).forEach((d, i) => {
    const { source, confidence } = entitySource(d);
    reg().add(`deal_killer_${i}`, d, "deal_killer", source, confidence);
  });

  // Negotiation talking points
  (brief.negotiationStrategy?.talkingPoints || []).forEach((t, i) => {
    const { source, confidence } = entitySource(t);
    reg().add(`talking_point_${i}`, t, "talking_point", source, confidence);
  });

  // Client type classification
  if (brief.clientTypeClassification) {
    const ct = brief.clientTypeClassification;
    reg().add("clientType", ct.type, "client_type", entitySource(ct.type).source, entitySource(ct.type).confidence);
  }

  // Project failure risk
  if (brief.projectFailureRisk) {
    (brief.projectFailureRisk.factors || []).forEach((f, i) => {
      const { source, confidence } = entitySource(f);
      reg().add(`failure_factor_${i}`, f, "failure_factor", source, confidence);
    });
  }

  (brief.effortAnalysis?.breakdown || []).forEach((item, i) => {
    const { source, confidence } = entitySource(item);
    reg().add(`effort_${i}`, item, "effort", source, confidence);
  });

  (brief.paymentTerms?.milestonePayments || []).forEach((item, i) => {
    const { source, confidence } = entitySource(item);
    reg().add(`payment_milestone_${i}`, item, "payment", source, confidence);
  });

  log("attribution", `Attributed ${reg().getAll().length} entities`, reg().getSummary());
}

// â”€â”€â”€ Unsupported Concept Detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function detectUnsupportedConcepts(brief: GeneratedBrief, rawInput: string): ExtractionWarning[] {
  const warnings: ExtractionWarning[] = [];
  const unsupported = reg().getUnsupported(0.3);

  for (const entity of unsupported) {
    if (entity.attribution.source === "generated" || entity.attribution.source === "fallback") {
      warnings.push({
        field: entity.category as any,
        status: "partial",
        message: `"${entity.value}" â€” not directly supported by source input. Possible consideration. Needs clarification.`,
      });
    }
  }

  // Check for new countries not in input
  const inputCountries = extractCountries(rawInput);
  const briefCountries = extractCountries(brief.projectSummary + " " + (brief.executiveSummary || ""));
  for (const c of briefCountries) {
    if (!inputCountries.includes(c)) {
      warnings.push({
        field: "scopeIncluded",
        status: "partial",
        message: `Country "${c}" appears in brief but not in source input. Needs clarification.`,
      });
    }
  }

  log("unsupported", `Detected ${warnings.length} unsupported concept(s)`);
  return warnings;
}

// â”€â”€â”€ Internal AI Verification Pass â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function internalVerificationPass(brief: GeneratedBrief, rawInput: string, callAi: (prompt: string) => Promise<string>): Promise<string[]> {
  const verifPrompt = `You are a quality auditor. Review this generated report against the original client message.

ORIGINAL CLIENT MESSAGE:
"""
${rawInput}
"""

GENERATED REPORT:
"""
Project Title: ${brief.projectTitle}
Summary: ${brief.projectSummary}
Executive Summary: ${brief.executiveSummary}
Scope Included: ${(brief.scopeIncluded || []).join(", ")}
Scope Excluded: ${(brief.scopeExcluded || []).join(", ")}
Objectives: ${(brief.objectives || []).join(", ")}
Deliverables: ${(brief.deliverables || []).map(d => d.name).join(", ")}
Timeline Milestones: ${(brief.timeline || []).map(t => t.milestone).join(", ")}
Risks: ${(brief.risks || []).map(r => r.risk).join(", ")}
Discovery Questions: ${(brief.discoveryQuestions || []).map(q => q.question).join(", ")}
Proposal Strategy: ${(brief.proposalStrategy || []).map(p => p.name + ": " + p.items.join(", ")).join(" | ")}
Upsell Opportunities: ${(brief.upsellOpportunities || []).map(u => u.service).join(", ")}
Missing Requirements: ${(brief.missingRequirements || []).map(m => m.requirement).join(", ")}
Deal Killers: ${(brief.dealKillers || []).join(", ")}
Client Type: ${brief.clientTypeClassification?.type || "N/A"}
Failure Risk Factors: ${(brief.projectFailureRisk?.factors || []).join(", ") || "N/A"}
Negotiation Talking Points: ${(brief.negotiationStrategy?.talkingPoints || []).join(", ") || "N/A"}
Decision: ${brief.projectDecision?.action || "N/A"}
"""

INSTRUCTIONS:
List every concept, entity, feature, risk, recommendation, technology, country, industry, or requirement that appears in the GENERATED REPORT but is NOT clearly supported by the ORIGINAL CLIENT MESSAGE.

For each unsupported concept, state: "[category]: [concept] â€” not supported by source"

If ALL content is supported, return: "ALL_SUPPORTED"

Return ONLY your findings â€” no preamble, no explanation.`;

  try {
    const aiText = await callAi(verifPrompt);
    const lines = aiText.split("\n").filter(l => l.trim() && !l.includes("ALL_SUPPORTED"));
    if (lines.length === 0) {
      log("verification", "AI verification passed â€” all content supported");
      return [];
    }
    const inconsistencies = lines.map(l => l.replace(/^[\s*-]*/, "").trim()).filter(l => l.length > 0);
    log("verification", `AI verification found ${inconsistencies.length} inconsistency(s)`, { inconsistencies });
    return inconsistencies;
  } catch (err) {
    log("verification", "AI verification failed â€” skipping", { error: String(err) });
    return [];
  }
}

// â”€â”€â”€ Diagnostics Builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildDiagnostics(rawInput: string): DiagnosticInfo {
  const ctx = activeContext();
  const entities = reg().getAll();
  const unsupported = reg().getUnsupported(0.3);
  const summary = reg().getSummary();
  const projectType = entities.find(e => e.category === "classification");
  const domainConfidence = computeDomainConfidence(reg());
  const consistencyScore = computeConsistencyScore(reg());

  const projectClassification = {
    type: projectType?.value || "Unknown",
    confidence: projectType?.attribution.confidence || 0,
    evidence: projectType?.attribution.evidence ? [projectType.attribution.evidence] : [],
  };

  const extractionWarnings = ctx?.extractionWarnings ?? _lastExtractionWarnings;
  const consistencyViolations = ctx?.consistencyViolations ?? _lastConsistencyViolations;
  const unsupportedConcepts = ctx?.unsupportedConcepts.length ? ctx.unsupportedConcepts : unsupported;
  const fallbackActivations = ctx?.fallbackActivations ?? _lastFallbackActivations;
  const regenerationTriggers = ctx?.regenerationTriggers ?? _lastRegenerationTriggers;
  const analysisInputs = ctx?.analysisInputs ?? _lastAnalysisInputs;
  const finalReportInputs = ctx?.finalReportInputs ?? _lastFinalReportInputs;
  const analysisArtifact = ctx?.analysisArtifact || undefined;
  const extractedRequirements = entities.filter(e => ["feature", "scope", "objective", "missing_requirement"].includes(e.category));
  const extractedIndustryDomain = {
    value: projectClassification.type,
    source: projectType?.attribution.source || "generated" as const,
    confidence: projectClassification.confidence,
    evidence: projectClassification.evidence.join("; ") || undefined,
  };

  return {
    rawInput,
    analysisArtifact,
    entities,
    projectClassification,
    extractedIndustryDomain,
    extractedRequirements,
    validationResults: {
      extractionWarnings,
      consistencyViolations,
      unsupportedConcepts,
    },
    classificationConfidence: projectClassification.confidence,
    analysisInputs,
    finalReportInputs,
    fallbackActivations,
    domainConfidence: Math.round(domainConfidence * 100),
    consistencyScore,
    unsupportedConcepts,
    regenerations: [],
    regenerationTriggers,
    extractionSummary: summary,
    consistencyViolations,
    verificationPass: { performed: false, inconsistencies: [], resolved: false },
    summary: {
      detectedDomain: projectClassification.type,
      domainConfidence: Math.round(domainConfidence * 100),
      extractedEntityCount: entities.length,
      unsupportedConceptCount: unsupportedConcepts.length,
      fallbackActivationCount: fallbackActivations.length,
      regenerationTriggerCount: regenerationTriggers.length,
    },
  };
}

function validateFinalReportGuards(brief: GeneratedBrief): string[] {
  const warnings: string[] = [];
  const ratingFields: Array<[string, number | undefined]> = [
    ["Profitability Score", brief.profitabilityScore?.score],
    ["Requirements Clarity", brief.proposalReadinessBreakdown?.requirements?.score],
    ["Technical Clarity", brief.proposalReadinessBreakdown?.technical?.score],
    ["Business Clarity", brief.proposalReadinessBreakdown?.business?.score],
    ["Budget Clarity", brief.proposalReadinessBreakdown?.budget?.score],
    ["Overall Readiness", brief.proposalReadinessBreakdown?.overallReadiness],
    ["Client Seriousness Score", brief.clientSeriousnessScore?.score],
  ];

  for (const [label, value] of ratingFields) {
    if (value == null || !Number.isFinite(value) || value < 0 || value > 10) {
      warnings.push(`${label} must be a 0-10 rating`);
    }
  }

  if (!Number.isFinite(brief.confidenceScore) || brief.confidenceScore < 0 || brief.confidenceScore > 100) {
    warnings.push("Confidence must be a 0-100 percentage");
  }

  if (brief.clientWinProbability && (!Number.isFinite(brief.clientWinProbability.probability) || brief.clientWinProbability.probability < 0 || brief.clientWinProbability.probability > 100)) {
    warnings.push("Client win probability must be a 0-100 percentage");
  }

  const estimatedBudget = brief.paymentTerms?.estimatedBudget;
  if (estimatedBudget && estimatedBudget !== "Not Specified" && estimatedBudget !== "To be discussed" && !/\d/.test(estimatedBudget)) {
    warnings.push("Budget value is not numerically formatted");
  }

  for (const milestone of brief.timeline || []) {
    if (!milestone.milestone || !milestone.description) {
      warnings.push("Timeline milestones require a milestone name and description");
    }
    if (!Number.isFinite(milestone.estimatedDays) || milestone.estimatedDays < 0) {
      warnings.push("Timeline estimated days must be a non-negative number");
    }
  }

  return warnings;
}

function hasUsefulText(value?: string): boolean {
  return !!value && !/not specified|to be discussed|cannot estimate|cannot calculate|unknown|requires clarification|not applicable/i.test(value);
}

function addUnique(items: string[], item: string): void {
  const normalized = item.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!normalized) return;
  if (!items.some(existing => existing.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === normalized)) {
    items.push(item);
  }
}

function projectCategory(brief: GeneratedBrief, rawInput: string): "website" | "saas" | "marketing" | "branding" | "general" {
  const text = `${rawInput} ${brief.projectTitle} ${brief.projectSummary} ${brief.scopeIncluded?.join(" ") || ""}`.toLowerCase();
  if (/(?:ad campaign|paid ads|performance marketing|social media|content calendar|seo|marketing|influencer)/i.test(text)) return "marketing";
  if (/(?:logo|brand|branding|identity|visual design|business cards|menu design|brand guideline)/i.test(text)) return "branding";
  if (/(?:website|landing page|wordpress|shopify|webflow|ecommerce|e-commerce|redesign|portfolio)/i.test(text)) return "website";
  if (/(?:saas|platform|dashboard|crm|portal|app|software|auth|api|database|integration|analytics)/i.test(text)) return "saas";
  return "general";
}

function recommendedExclusions(category: ReturnType<typeof projectCategory>, rawInput: string): string[] {
  const common = [
    "Work outside the confirmed scope and deliverables",
    "Unlimited revisions or open-ended change requests",
    "Third-party subscription, licensing, hosting, or ad spend costs",
    "Ongoing support or maintenance after handover unless separately agreed",
  ];

  const byCategory: Record<ReturnType<typeof projectCategory>, string[]> = {
    website: [
      "Mobile app development",
      "Custom CRM or internal operations system",
      "Custom booking engine or complex backend workflows",
      "Content writing, photography, or videography",
      "SEO retainers, hosting management, and post-launch optimization",
    ],
    saas: [
      "Infrastructure usage costs and cloud vendor fees",
      "Future feature requests beyond the first agreed release",
      "Ongoing customer support, monitoring, or SLA coverage",
      "Third-party integration fees, marketplace approvals, or vendor subscriptions",
      "Native mobile apps unless explicitly included",
    ],
    marketing: [
      "Media buying budget or ad spend",
      "Influencer, creator, or partner fees",
      "Video, photo, or large-scale creative production unless scoped",
      "Landing page development or engineering support unless separately included",
    ],
    branding: [
      "Trademark search, registration, or legal clearance",
      "Printing, production, packaging, or vendor coordination costs",
      "Photography, copywriting, or content creation unless separately scoped",
      "Additional collateral beyond the agreed brand deliverables",
    ],
    general: [
      "Procurement of third-party tools, licenses, or subscriptions",
      "Content creation, data entry, or asset production unless explicitly scoped",
      "Training, operations handover, or post-launch support beyond the agreed delivery window",
    ],
  };

  const exclusions = [...byCategory[category], ...common];
  if (!/(?:mobile|ios|android)/i.test(rawInput) && category !== "saas") addUnique(exclusions, "Native iOS or Android app development");
  return exclusions;
}

function projectSize(brief: GeneratedBrief): "small" | "medium" | "large" {
  const budgetNumber = Number(String(brief.paymentTerms?.estimatedBudget || "").replace(/[^\d]/g, ""));
  const scopeCount = (brief.scopeIncluded || []).filter(item => !/requires clarification|not specified/i.test(item)).length;
  const totalDays = (brief.timeline || []).reduce((sum, item) => sum + (Number.isFinite(item.estimatedDays) ? item.estimatedDays : 0), 0);

  if (budgetNumber >= 1000000 || scopeCount >= 9 || totalDays >= 90) return "large";
  if (budgetNumber >= 150000 || scopeCount >= 4 || totalDays >= 30) return "medium";
  return "small";
}

function enrichPaymentTerms(brief: GeneratedBrief): void {
  const size = projectSize(brief);
  const paymentTerms = brief.paymentTerms || { estimatedBudget: "Not Specified", deposit: "", milestonePayments: [], finalPayment: "" };
  const missingDeposit = !hasUsefulText(paymentTerms.deposit);
  const missingFinal = !hasUsefulText(paymentTerms.finalPayment);
  const weakMilestones = !paymentTerms.milestonePayments?.length || paymentTerms.milestonePayments.every(item => !hasUsefulText(item));
  const needsRecommendation = missingDeposit || missingFinal || weakMilestones;

  if (!needsRecommendation) {
    brief.paymentTerms = { ...paymentTerms, structureLabel: paymentTerms.structureLabel || "Payment Structure" };
    return;
  }

  const recommended = size === "large"
    ? {
        deposit: "30% upfront to reserve capacity and begin discovery",
        milestonePayments: ["25% after discovery and scope approval", "25% after core milestone approval", "20% before launch or final handover"],
        finalPayment: "Final handover only after all approved invoices are cleared",
      }
    : size === "medium"
      ? {
          deposit: "40% upfront",
          milestonePayments: ["40% after milestone approval", "20% before launch or final delivery"],
          finalPayment: "20% before launch or final delivery",
        }
      : {
          deposit: "50% upfront",
          milestonePayments: ["50% before final delivery"],
          finalPayment: "50% before final delivery",
        };

  brief.paymentTerms = {
    ...paymentTerms,
    structureLabel: "Recommended Payment Structure",
    deposit: missingDeposit ? recommended.deposit : paymentTerms.deposit,
    milestonePayments: weakMilestones ? recommended.milestonePayments : paymentTerms.milestonePayments,
    finalPayment: missingFinal ? recommended.finalPayment : paymentTerms.finalPayment,
  };
}

function missingRequirementAdvice(requirement: string): { whyItMatters: string; proposalImpact: string } {
  const lower = requirement.toLowerCase();
  if (/budget|payment|commercial|price/.test(lower)) {
    return {
      whyItMatters: "Budget defines the feasible scope, phasing, and negotiation position.",
      proposalImpact: "Without a budget range, the proposal should use phased options and avoid a single fixed commitment.",
    };
  }
  if (/timeline|deadline|launch/.test(lower)) {
    return {
      whyItMatters: "Timeline determines delivery sequencing, resourcing, and whether the scope is realistic.",
      proposalImpact: "The proposal should present a recommended timeline assumption and flag fast-track pricing if urgency is high.",
    };
  }
  if (/technical|architecture|hosting|database|stack|infrastructure/.test(lower)) {
    return {
      whyItMatters: "Technical choices affect implementation complexity, operating cost, reliability, and ownership.",
      proposalImpact: "The proposal should include a discovery or architecture checkpoint before final build pricing.",
    };
  }
  if (/ui|ux|design|brand|guideline|content/.test(lower)) {
    return {
      whyItMatters: "Design, content, and brand inputs affect effort, review cycles, and acceptance criteria.",
      proposalImpact: "The proposal should separate design/content assumptions from development scope.",
    };
  }
  if (/compliance|privacy|security|approval|access/.test(lower)) {
    return {
      whyItMatters: "Compliance and security requirements can materially change architecture, testing, and sign-off.",
      proposalImpact: "The proposal should reserve scope for controls, approvals, and compliance validation.",
    };
  }
  return {
    whyItMatters: "This detail affects scope boundaries, pricing confidence, or delivery risk.",
    proposalImpact: "The proposal should label this as an assumption and confirm it before contract sign-off.",
  };
}

function enrichMissingRequirements(brief: GeneratedBrief): void {
  const items = brief.missingRequirements || [];
  if (items.length === 0) {
    items.push({
      requirement: "Acceptance criteria and final sign-off process",
      priority: "IMPORTANT",
      ...missingRequirementAdvice("Acceptance criteria and final sign-off process"),
    });
  }

  brief.missingRequirements = items
    .map(item => {
      const advice = missingRequirementAdvice(item.requirement);
      return {
        ...item,
        whyItMatters: item.whyItMatters || advice.whyItMatters,
        proposalImpact: item.proposalImpact || advice.proposalImpact,
      };
    })
    .sort((a, b) => {
      const rank: Record<string, number> = { CRITICAL: 0, IMPORTANT: 1, OPTIONAL: 2 };
      return (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2);
    });
}

function enrichUpsells(brief: GeneratedBrief, category: ReturnType<typeof projectCategory>): void {
  const upsells = [...(brief.upsellOpportunities || [])];

  function addUpsell(service: string, rationale: string) {
    if (!upsells.some(item => item.service.toLowerCase() === service.toLowerCase())) {
      upsells.push({ service, rationale });
    }
  }

  if (category === "website") {
    addUpsell("Maintenance and hosting management", "Website clients often need updates, backups, uptime checks, and vendor coordination after launch.");
    addUpsell("SEO and conversion optimization package", "A launched website becomes more valuable when search visibility and lead conversion are actively improved.");
  } else if (category === "saas") {
    addUpsell("Support and monitoring retainer", "Software products need post-launch issue handling, uptime monitoring, and release support.");
    addUpsell("Analytics and reporting dashboard", "Usage and conversion data help the client make better product and business decisions after launch.");
  } else if (category === "marketing") {
    addUpsell("Campaign reporting package", "Marketing work becomes easier to renew when performance reporting is scoped from the start.");
    addUpsell("Content production package", "Campaign execution usually needs recurring creative assets beyond strategy.");
  } else if (category === "branding") {
    addUpsell("Brand rollout collateral package", "Brand identity work often creates follow-on needs for social templates, decks, print files, and launch assets.");
    addUpsell("Ongoing design support retainer", "Clients commonly need help applying a new identity across future collateral.");
  } else {
    addUpsell("Discovery and scoping workshop", "A paid scoping step reduces estimation risk and creates a stronger proposal.");
    addUpsell("Post-launch support retainer", "Most projects need stabilization and small improvements after delivery.");
  }

  brief.upsellOpportunities = upsells
    .filter(item => hasUsefulText(item.service) && hasUsefulText(item.rationale))
    .slice(0, 5);
}

function buildProposalReadySummary(brief: GeneratedBrief): GeneratedBrief["proposalReadySummary"] {
  const deliverables = (brief.deliverables || []).map(item => item.name).filter(hasUsefulText);
  const scopeItems = (brief.scopeIncluded || []).filter(hasUsefulText);
  const assumptions = (brief.assumptions || []).filter(hasUsefulText);
  const timelineDays = (brief.timeline || []).reduce((sum, item) => sum + (Number.isFinite(item.estimatedDays) ? item.estimatedDays : 0), 0);
  const timelineRecommendation = timelineDays > 0
    ? `Plan around approximately ${timelineDays} delivery days across the listed milestones, with scope confirmation before kickoff.`
    : "Recommend a discovery call first, then present a phased timeline after requirements and approval steps are confirmed.";
  const pricingRecommendation = hasUsefulText(brief.pricingGuidance?.suggestedFixedPrice)
    ? `Use ${brief.pricingGuidance.suggestedFixedPrice} as the proposal anchor, with ${brief.pricingGuidance.confidence.toLowerCase()} pricing confidence.`
    : `Use ${brief.paymentTerms?.structureLabel || "recommended payment terms"} and present pricing after scope, timeline, and budget are confirmed.`;

  return {
    projectOverview: brief.executiveSummary || brief.projectSummary || "Client project requires proposal scoping before commitment.",
    likelyDeliverables: deliverables.length > 0
      ? deliverables.slice(0, 6)
      : scopeItems.length > 0
        ? scopeItems.slice(0, 6)
        : ["Discovery notes, confirmed scope, proposal-ready deliverables, and acceptance criteria"],
    timelineRecommendation,
    pricingRecommendation,
    majorAssumptions: assumptions.length > 0 ? assumptions.slice(0, 5) : ["Scope, timeline, and acceptance criteria will be confirmed before final proposal sign-off."],
    suggestedEngagementApproach: brief.projectDecision?.action === "Accept with Conditions"
      ? "Proceed with a phased proposal, keeping assumptions visible and tying each phase to approval milestones."
      : "Start with a paid or structured discovery step before committing to final pricing and delivery dates.",
  };
}

function buildClientWinProbability(brief: GeneratedBrief): GeneratedBrief["clientWinProbability"] {
  const budgetKnown = hasUsefulText(brief.paymentTerms?.estimatedBudget) || hasUsefulText(brief.budgetRealityCheck?.clientBudget);
  const timelineKnown = (brief.timeline || []).some(item => item.estimatedDays > 0 || hasUsefulText(item.description));
  const requirementCount = (brief.scopeIncluded || []).filter(hasUsefulText).length;
  const criticalMissing = (brief.missingRequirements || []).filter(item => item.priority === "CRITICAL").length;
  const highRisks = (brief.risks || []).filter(item => item.severity === "high" || item.priority === "CRITICAL").length;

  let probability = 30;
  if (budgetKnown) probability += 15;
  if (timelineKnown) probability += 10;
  probability += Math.min(requirementCount * 4, 20);
  if (brief.clientRiskScore?.level === "Low") probability += 10;
  if (brief.projectDecision?.action === "Accept with Conditions") probability += 8;
  probability -= criticalMissing * 6;
  probability -= highRisks * 4;
  probability = Math.max(15, Math.min(90, probability));

  const positives: string[] = [];
  const concerns: string[] = [];
  if (budgetKnown) positives.push("Budget or commercial signal is present");
  else concerns.push("Budget is not confirmed");
  if (timelineKnown) positives.push("Timeline or delivery structure is available");
  else concerns.push("Timeline needs confirmation");
  if (requirementCount > 0) positives.push(`${requirementCount} scoped requirement${requirementCount === 1 ? "" : "s"} identified`);
  else concerns.push("Requirements are still too vague for confident pricing");
  if (criticalMissing > 0) concerns.push(`${criticalMissing} critical proposal gap${criticalMissing === 1 ? "" : "s"} remain`);

  return {
    probability,
    reasoning: `Estimated from budget realism, timeline clarity, requirement detail, client risk, and remaining critical gaps.`,
    positiveIndicators: positives.length > 0 ? positives : ["Client has expressed project intent"],
    concerns: concerns.length > 0 ? concerns : ["No major win blockers detected, but assumptions should still be confirmed"],
    negotiationAdvice: probability >= 70
      ? "Move toward a phased proposal with clear exclusions and approval checkpoints."
      : probability >= 45
        ? "Use discovery to confirm budget, timeline, and must-have scope before presenting final pricing."
        : "Do not over-invest in proposal detail until budget, decision urgency, and scope seriousness are confirmed.",
  };
}

function buildClientSeriousnessScore(brief: GeneratedBrief): GeneratedBrief["clientSeriousnessScore"] {
  const signals: string[] = [];
  let score = 2;
  if (hasUsefulText(brief.paymentTerms?.estimatedBudget)) { score += 2; signals.push("Budget provided or inferred from client message"); }
  else signals.push("Budget not yet provided");
  if ((brief.timeline || []).some(item => item.estimatedDays > 0 || hasUsefulText(item.description))) { score += 1.5; signals.push("Timeline or delivery need is present"); }
  else signals.push("Timeline not yet provided");
  const requirementCount = (brief.scopeIncluded || []).filter(hasUsefulText).length;
  if (requirementCount >= 5) { score += 2; signals.push("Detailed requirement set provided"); }
  else if (requirementCount > 0) { score += 1; signals.push("Some requirements provided"); }
  else signals.push("Requirement detail is limited");
  if (brief.clientTypeClassification && !/unknown/i.test(brief.clientTypeClassification.type)) { score += 1; signals.push(`Client/project type classified as ${brief.clientTypeClassification.type}`); }
  if (brief.projectDecision?.action === "Accept with Conditions") { score += 1; signals.push("Enough detail exists to proceed with conditions"); }

  const normalized = Math.max(1, Math.min(10, Math.round(score)));
  return {
    score: normalized,
    signals,
    explanation: `Assigned ${normalized}/10 based on budget signal, timeline signal, requirement detail, business maturity, and proposal readiness.`,
  };
}

function enrichConsultantIntelligence(brief: GeneratedBrief, rawInput: string): void {
  const category = projectCategory(brief, rawInput);

  const existingExclusions = (brief.scopeExcluded || []).filter(hasUsefulText);
  const exclusions = [...existingExclusions];
  for (const item of recommendedExclusions(category, rawInput)) addUnique(exclusions, item);
  brief.scopeExcluded = exclusions.slice(0, 8);

  enrichPaymentTerms(brief);
  enrichMissingRequirements(brief);
  enrichUpsells(brief, category);

  brief.proposalReadySummary = brief.proposalReadySummary || buildProposalReadySummary(brief);
  brief.clientWinProbability = brief.clientWinProbability || buildClientWinProbability(brief);
  brief.clientSeriousnessScore = brief.clientSeriousnessScore || buildClientSeriousnessScore(brief);

  recordAnalysisInputs({
    consultantIntelligenceCategory: category,
    consultantIntelligenceAdded: {
      exclusions: brief.scopeExcluded.length,
      paymentStructure: brief.paymentTerms?.structureLabel,
      missingRequirementImpact: brief.missingRequirements?.filter(item => item.whyItMatters && item.proposalImpact).length || 0,
      winProbability: brief.clientWinProbability?.probability,
      seriousnessScore: brief.clientSeriousnessScore?.score,
    },
  });
}

function attachFinalDiagnostics(
  brief: GeneratedBrief,
  rawInput: string,
  consistencyViolations: ConsistencyViolation[],
  verificationPass: DiagnosticInfo["verificationPass"] = { performed: false, inconsistencies: [], resolved: false },
): GeneratedBrief {
  enrichConsultantIntelligence(brief, rawInput);
  const structuralLabelWarnings = sanitizeStructuralLabelEntities(brief);
  const metricWarnings = [...normalizeBriefMetrics(brief), ...validateFinalReportGuards(brief)];
  if (structuralLabelWarnings.length > 0 || metricWarnings.length > 0) {
    brief.numericalValidation = {
      isValid: (brief.numericalValidation?.isValid ?? true) && metricWarnings.length === 0,
      warnings: [...(brief.numericalValidation?.warnings || []), ...metricWarnings],
    };
    brief.extractionWarnings = [
      ...(brief.extractionWarnings || []),
      ...structuralLabelWarnings,
      ...metricWarnings.map(message => ({ field: "numericalValidation" as const, status: "partial" as const, message })),
    ];
    if (structuralLabelWarnings.length > 0) log("validation", "Rejected structural labels before final output", structuralLabelWarnings);
    if (metricWarnings.length > 0) log("validation", "Numeric validation guard warnings", metricWarnings);
  }

  recordExtractionWarnings(brief.extractionWarnings || []);
  recordConsistencyViolations(consistencyViolations);
  recordUnsupportedConcepts(reg().getUnsupported(0.3));
  recordFinalReportInputs({
    projectTitle: brief.projectTitle,
    classification: reg().get("classification", "projectType")?.value || brief.clientTypeClassification?.type || "Unknown",
    objectives: brief.objectives || [],
    scopeIncluded: brief.scopeIncluded || [],
    deliverables: (brief.deliverables || []).map(d => d.name),
    risks: (brief.risks || []).map(r => r.risk),
    proposalStrategy: (brief.proposalStrategy || []).map(p => ({ name: p.name, items: p.items })),
    discoveryQuestions: (brief.discoveryQuestions || []).map(q => q.question),
    proposalReadySummary: brief.proposalReadySummary,
    clientWinProbability: brief.clientWinProbability,
    clientSeriousnessScore: brief.clientSeriousnessScore,
    extractionWarnings: brief.extractionWarnings || [],
  });

  const diagnostics = buildDiagnostics(rawInput);
  diagnostics.consistencyViolations = consistencyViolations;
  diagnostics.validationResults.consistencyViolations = consistencyViolations;
  diagnostics.verificationPass = verificationPass;
  diagnostics.summary.regenerationTriggerCount = diagnostics.regenerationTriggers.length;
  brief.proposalReadinessIntelligence = buildProposalReadinessIntelligence(brief, diagnostics);
  brief._diagnostics = diagnostics;
  const ctx = activeContext();
  if (ctx) ctx.lastDiagnostics = diagnostics;
  _lastDiagnostics = diagnostics;

  log("FINAL_REPORT_INPUTS", "Final report inputs captured", diagnostics.finalReportInputs);
  log("diagnostics", "Diagnostic summary", diagnostics.summary);
  return brief;
}

function reportSurfaceForDiff(brief: GeneratedBrief): Record<string, unknown> {
  return {
    projectTitle: brief.projectTitle,
    executiveSummary: brief.executiveSummary,
    objectives: brief.objectives || [],
    scopeIncluded: brief.scopeIncluded || [],
    deliverables: (brief.deliverables || []).map(d => d.name),
    risks: (brief.risks || []).map(r => r.risk),
    missingRequirements: (brief.missingRequirements || []).map(r => r.requirement),
    proposalStrategy: (brief.proposalStrategy || []).map(p => p.items),
    discoveryQuestions: (brief.discoveryQuestions || []).map(q => q.question),
    clientTypeClassification: brief.clientTypeClassification,
    projectFailureRisk: brief.projectFailureRisk,
    pricingGuidance: brief.pricingGuidance,
    budgetRealityCheck: brief.budgetRealityCheck,
  };
}

function changedReportSurfaceFields(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  return Object.keys(after).filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

// â”€â”€â”€ Gemini Provider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function generateWithGemini(rawInput: string): Promise<GeneratedBrief> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("CONFIG_MISSING_API_KEY");
  }

  log("input", "INPUT RECEIVED", {
    length: rawInput.length,
    rawInput,
    preview: rawInput.slice(0, 300),
    hasBudget: extractBudget(rawInput),
    hasTimeline: extractTimeline(rawInput),
    hasCountries: extractCountries(rawInput),
  });
  recordAnalysisInputs({ rawInput });

  let lastGenerationFailure: Error | null = null;

  function rememberGenerationFailure(code: string, data?: unknown): void {
    lastGenerationFailure = new Error(code);
    log("failure", code, data);
  }

  function normalizeProviderFailure(error: unknown): Error {
    if (error instanceof Error) {
      if (error.message === "AbortError" || error.name === "AbortError") {
        return new Error("PROVIDER_TIMEOUT");
      }

      if (
        error.message.startsWith("PROVIDER_") ||
        error.message.startsWith("CONFIG_") ||
        error.message === "REPORT_VALIDATION_FAILED"
      ) {
        return error;
      }
    }

    return new Error("PROVIDER_UNAVAILABLE");
  }

  async function callGemini(promptText: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    let response: Response;

    try {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" + apiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
            },
          }),
        },
      );
    } catch (err) {
      const normalized = normalizeProviderFailure(err);
      log("api", "Gemini network failure", { error: String(err), code: normalized.message });
      throw normalized;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      log("api", `Gemini API error: ${response.status}`, { body: errorBody.slice(0, 500) });
      if (response.status === 429) throw new Error("PROVIDER_RATE_LIMIT");
      if (response.status >= 500) throw new Error("PROVIDER_UNAVAILABLE");
      if (response.status === 403) throw new Error("CONFIG_INVALID_API_KEY");
      throw new Error("PROVIDER_REQUEST_FAILED");
    }

    let data: any;
    try {
      data = await response.json();
    } catch (err) {
      log("api", "Gemini returned invalid JSON envelope", { error: String(err) });
      throw new Error("PROVIDER_INVALID_RESPONSE");
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      log("api", "Gemini returned empty response", { data });
      throw new Error("PROVIDER_INVALID_RESPONSE");
    }

    log("api", "RAW AI RESPONSE", {
      length: text.length,
      preview: text.slice(0, 500),
      endPreview: text.slice(-200),
    });

    return text;
  }

  // â”€â”€ Attempt 1: Primary generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  log("attempt", "Attempt 1: Primary generation");
  const promptText = rawInput;

  try {
    const aiText = await callGemini(promptText);
    const parsed = parseWithRepair(aiText);

    if (parsed) {
      const fields = countExtractedFields(parsed);
      log("VALIDATED_DATA", "Brief from primary generation", {
        fieldsPresent: fields.present,
        fieldsTotal: fields.total,
        missingFields: fields.missing,
        budget: parsed.paymentTerms?.estimatedBudget,
        timeline: parsed.timeline?.map(t => t.milestone).join(", "),
      });

      if (fields.present >= 4) {
        log("success", "Primary generation succeeded");
        let brief = { ...parsed, extractionWarnings: fields.warnings } as GeneratedBrief;
        scanAndAttributeEntities(brief, rawInput);
        const unsupportedWarnings = detectUnsupportedConcepts(brief, rawInput);
        brief.extractionWarnings = [...(brief.extractionWarnings || []), ...unsupportedWarnings];
        let cv = [...validateConsistency(brief, rawInput), ...validateDomainConsistency(brief, rawInput)];
        if (cv.length > 0) {
          recordRegenerationTrigger(`Primary brief had ${cv.length} consistency/domain violation(s)`);
          log("regeneration", `Primary brief has ${cv.length} consistency violation(s) â€” regenerating`);
          brief = regenerateInconsistentSections(brief, cv, rawInput);
          scanAndAttributeEntities(brief, rawInput);
          cv = [...validateConsistency(brief, rawInput), ...validateDomainConsistency(brief, rawInput)];
        }
        return attachFinalDiagnostics(brief, rawInput, cv, { performed: false, inconsistencies: [], resolved: cv.length === 0 });
      }
      log("attempt", `Primary generation only had ${fields.present}/${fields.total} fields â€” will merge with extraction`);
    }
  } catch (err) {
    const failure = normalizeProviderFailure(err);
    rememberGenerationFailure(failure.message, { error: String(err) });
    log("attempt", "Primary generation threw", { error: String(err), code: failure.message });
  }

  // â”€â”€ Attempt 2: Retry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  log("attempt", "Attempt 2: Retry");
  const retryPrompt = `Return valid JSON for this client message. Every field in the schema must be present. Use "Not Specified" or [] for missing information. Do not invent details.\n\n${rawInput}`;

  try {
    const aiText = await callGemini(retryPrompt);
    const parsed = parseWithRepair(aiText);

    if (parsed) {
      const fields = countExtractedFields(parsed);
      log("VALIDATED_DATA", "Brief from retry generation", {
        fieldsPresent: fields.present,
        fieldsTotal: fields.total,
        missingFields: fields.missing,
        budget: parsed.paymentTerms?.estimatedBudget,
        timeline: parsed.timeline?.map(t => t.milestone).join(", "),
      });

      if (fields.present >= 4) {
        log("success", "Retry generation succeeded");
        let brief = { ...parsed, extractionWarnings: fields.warnings } as GeneratedBrief;
        scanAndAttributeEntities(brief, rawInput);
        const unsupportedWarnings = detectUnsupportedConcepts(brief, rawInput);
        brief.extractionWarnings = [...(brief.extractionWarnings || []), ...unsupportedWarnings];
        let cv = [...validateConsistency(brief, rawInput), ...validateDomainConsistency(brief, rawInput)];
        if (cv.length > 0) {
          recordRegenerationTrigger(`Retry brief had ${cv.length} consistency/domain violation(s)`);
          log("regeneration", `Retry brief has ${cv.length} consistency violation(s) â€” regenerating`);
          brief = regenerateInconsistentSections(brief, cv, rawInput);
          scanAndAttributeEntities(brief, rawInput);
          cv = [...validateConsistency(brief, rawInput), ...validateDomainConsistency(brief, rawInput)];
        }
        return attachFinalDiagnostics(brief, rawInput, cv, { performed: false, inconsistencies: [], resolved: cv.length === 0 });
      }
      log("attempt", `Retry had ${fields.present}/${fields.total} fields â€” merging with extraction`);
      rememberGenerationFailure("REPORT_VALIDATION_FAILED", { fieldsPresent: fields.present, fieldsTotal: fields.total });
    } else {
      rememberGenerationFailure("PROVIDER_INVALID_RESPONSE");
    }
  } catch (err) {
    const failure = normalizeProviderFailure(err);
    rememberGenerationFailure(failure.message, { error: String(err) });
    log("attempt", "Retry generation threw", { error: String(err), code: failure.message });
  }

  throw lastGenerationFailure ?? new Error("PROVIDER_INVALID_RESPONSE");

  // â”€â”€ Attempt 3: Extraction + partial AI merge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  log("attempt", "Attempt 3: Smart extraction with budget/timeline/features preservation");
  const extracted = extractFromRawText(rawInput);
  const warnings = extracted.extractionWarnings || [];

  // Merge: extracted data first, then overlay anything from partial AI
  // CRITICAL: never let a generic fallback overwrite extracted real data
  const baseFallback = createFallbackBrief(rawInput);

  const merged: GeneratedBrief = {
    // Start with a complete but generic skeleton
    ...baseFallback,
    // Overlay EVERYTHING from extraction (replaces all generic fields)
    ...extracted,
    // Fix missing nested objects that spread might have skipped
    projectTitle: extracted.projectTitle || baseFallback.projectTitle,
    projectSummary: extracted.projectSummary || baseFallback.projectSummary,
    executiveSummary: extracted.executiveSummary || baseFallback.executiveSummary,
    objectives: (extracted.objectives?.length || 0) > 0 ? extracted.objectives! : baseFallback.objectives,
    scopeIncluded: (extracted.scopeIncluded?.length || 0) > 0 ? extracted.scopeIncluded! : baseFallback.scopeIncluded,
    deliverables: (extracted.deliverables?.length || 0) > 0 ? extracted.deliverables! : baseFallback.deliverables,
    timeline: (extracted.timeline?.length || 0) > 0 ? extracted.timeline! : baseFallback.timeline,
    paymentTerms: extracted.paymentTerms || baseFallback.paymentTerms,
    risks: (extracted.risks?.length || 0) > 0 ? extracted.risks! : baseFallback.risks,
    discoveryQuestions: (extracted.discoveryQuestions?.length || 0) > 0 ? extracted.discoveryQuestions! : baseFallback.discoveryQuestions,
    missingRequirements: (extracted.missingRequirements?.length || 0) > 0 ? extracted.missingRequirements! : baseFallback.missingRequirements,
    upsellOpportunities: (extracted.upsellOpportunities?.length || 0) > 0 ? extracted.upsellOpportunities! : baseFallback.upsellOpportunities,
    scopeCreepWarnings: (extracted.scopeCreepWarnings?.length || 0) > 0 ? extracted.scopeCreepWarnings! : baseFallback.scopeCreepWarnings,
    nextSteps: (extracted.nextSteps?.length || 0) > 0 ? extracted.nextSteps! : baseFallback.nextSteps,
    redFlags: (extracted.redFlags?.length || 0) > 0 ? extracted.redFlags! : baseFallback.redFlags,
    effortAnalysis: extracted.effortAnalysis || baseFallback.effortAnalysis,
    proposalReadinessBreakdown: extracted.proposalReadinessBreakdown || baseFallback.proposalReadinessBreakdown,
    numericalValidation: extracted.numericalValidation || baseFallback.numericalValidation,
    budgetRealityCheck: extracted.budgetRealityCheck || baseFallback.budgetRealityCheck,
    proposalStrategy: (extracted.proposalStrategy?.length || 0) > 0 ? extracted.proposalStrategy! : baseFallback.proposalStrategy,
    dealKillers: (extracted.dealKillers?.length || 0) > 0 ? extracted.dealKillers! : baseFallback.dealKillers,
    clientRiskScore: extracted.clientRiskScore || baseFallback.clientRiskScore,
    pricingGuidance: extracted.pricingGuidance || baseFallback.pricingGuidance,
    profitabilityScore: extracted.profitabilityScore || baseFallback.profitabilityScore,
    negotiationStrategy: extracted.negotiationStrategy || baseFallback.negotiationStrategy,
    clientTypeClassification: extracted.clientTypeClassification || baseFallback.clientTypeClassification,
    projectFailureRisk: extracted.projectFailureRisk || baseFallback.projectFailureRisk,
    projectDecision: extracted.projectDecision || baseFallback.projectDecision,
    clientResponseDraft: extracted.clientResponseDraft || baseFallback.clientResponseDraft,
    extractionWarnings: warnings,
  };

  // Try to overlay partial AI data on top if available
  const beforePartialOverlay = reportSurfaceForDiff(merged);
  try {
    const partialPrompt = `Return ONLY valid JSON with these fields from the client message. Use "Not Specified" or [] for missing info.\n\n{\n  "executiveSummary": "...",\n  "redFlags": [...],\n  "discoveryQuestions": [{"question": "...", "context": "...", "priority": "CRITICAL"}],\n  "projectDecision": {"action": "...", "reasoning": "..."},\n  "clientResponseDraft": "..."\n}\n\n${rawInput}`;

    const aiText = await callGemini(partialPrompt);
    const partial = parseWithRepair(aiText);

    if (!partial) {
      throw new Error("PROVIDER_INVALID_RESPONSE");
    }
    const partialBrief = partial as GeneratedBrief;

    log("VALIDATED_DATA", "Partial AI overlay received", {
      hasExecSummary: !!partialBrief.executiveSummary,
      hasDecision: !!partialBrief.projectDecision,
      hasResponse: !!partialBrief.clientResponseDraft,
      risksCount: partialBrief.risks?.length,
      questionsCount: partialBrief.discoveryQuestions?.length,
    });

    // Overlay only narrative fields. Structural report data must remain artifact-driven.
    if (partialBrief.executiveSummary && partialBrief.executiveSummary !== merged.executiveSummary) merged.executiveSummary = partialBrief.executiveSummary;
    if (partialBrief.redFlags?.length) merged.redFlags = partialBrief.redFlags;
    if (partialBrief.projectDecision) merged.projectDecision = partialBrief.projectDecision;
    if (partialBrief.clientResponseDraft) merged.clientResponseDraft = partialBrief.clientResponseDraft;

    log("success", "Partial AI merge completed â€” extraction data preserved, AI enriched where possible");
  } catch (err) {
    log("attempt", "Partial AI overlay failed â€” using extraction data only", { error: String(err) });
  }
  const partialOverlayChangedFields = changedReportSurfaceFields(beforePartialOverlay, reportSurfaceForDiff(merged));
  if (partialOverlayChangedFields.length > 0) {
    recordAnalysisInputs({ partialOverlayChangedFields });
    log("PARTIAL_OVERLAY", "Partial AI overlay changed report fields", { partialOverlayChangedFields });
  }

  // â”€â”€ Finalization Pipeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const finalFields = countExtractedFields(merged);
  log("VALIDATED_DATA", "FINAL MERGED BRIEF", {
    fieldsPresent: finalFields.present,
    fieldsTotal: finalFields.total,
    missingFields: finalFields.missing,
    budget: merged.paymentTerms?.estimatedBudget,
    timeline: merged.timeline?.map(t => t.milestone).join(", "),
    title: merged.projectTitle,
  });

  // Step 1: Validate traceability to source input
  const validationViolations = validateExtractionAgainstSource(rawInput, merged);
  if (validationViolations.length > 0) {
    merged.extractionWarnings = [...(merged.extractionWarnings || []), ...validationViolations];
    log("warning", `${validationViolations.length} cross-request leakage warning(s) appended to extractionWarnings`);
  }

  // Step 2: Source attribution â€” scan every entity and classify source
  scanAndAttributeEntities(merged, rawInput);

  // Step 3: Detect unsupported concepts (low-confidence entities)
  const unsupportedWarnings = detectUnsupportedConcepts(merged, rawInput);
  if (unsupportedWarnings.length > 0) {
    merged.extractionWarnings = [...(merged.extractionWarnings || []), ...unsupportedWarnings];
  }

  // Step 4: Consistency validation â€” cross-section domain alignment
  const consistencyViolations = [...validateConsistency(merged, rawInput), ...validateDomainConsistency(merged, rawInput)];
  let cvResolved = consistencyViolations.length === 0;

  // Step 5: Regenerate inconsistent sections from extracted data
  if (consistencyViolations.length > 0) {
    recordRegenerationTrigger(`Merged brief had ${consistencyViolations.length} consistency/domain violation(s)`);
    log("regeneration", `${consistencyViolations.length} consistency violation(s) found â€” regenerating affected sections`);
    const regenerated = regenerateInconsistentSections(merged, consistencyViolations, rawInput);
    scanAndAttributeEntities(regenerated, rawInput);
    const recheckViolations = [...validateConsistency(regenerated, rawInput), ...validateDomainConsistency(regenerated, rawInput)];
    if (recheckViolations.length > 0) {
      cvResolved = false;
      log("regeneration", `${recheckViolations.length} violation(s) remain after regeneration â€” appended to warnings`);
      regenerated.extractionWarnings = [...(regenerated.extractionWarnings || []), ...recheckViolations.map(v => ({
        field: v.section as any,
        status: "partial" as const,
        message: `Consistency: ${v.detail}`,
      }))];
    } else {
      cvResolved = true;
      log("regeneration", "All consistency violations resolved after regeneration");
    }

    const finalBrief = attachFinalDiagnostics(regenerated, rawInput, recheckViolations, { performed: false, inconsistencies: [], resolved: cvResolved });
    finalBrief._diagnostics!.regenerations = [`Regenerated ${consistencyViolations.length} inconsistent section(s)`];
    log("success", `Pipeline complete â€” ${finalBrief._diagnostics!.consistencyScore}% consistency score, ${finalBrief._diagnostics!.extractionSummary.fromInput}/${finalBrief._diagnostics!.extractionSummary.total} entities from input`);
    return finalBrief;
  }

  // Step 6: AI internal verification pass (only for lower-confidence briefs)
  let verifInconsistencies: string[] = [];
  let verifPerformed = false;
  if (merged.confidenceScore < 60) {
    try {
      verifInconsistencies = await internalVerificationPass(merged, rawInput, callGemini);
      verifPerformed = true;
      if (verifInconsistencies.length > 0) {
        log("verification", `AI verification found issues â€” appending warnings`);
        merged.extractionWarnings = [...(merged.extractionWarnings || []), ...verifInconsistencies.map(v => ({
          field: "verification" as any,
          status: "partial" as const,
          message: v,
        }))];
      }
    } catch (_) { /* verification is best-effort */ }
  }

  const finalBrief = attachFinalDiagnostics(merged, rawInput, consistencyViolations, { performed: verifPerformed, inconsistencies: verifInconsistencies, resolved: verifInconsistencies.length === 0 });
  log("success", `Pipeline complete â€” ${finalBrief._diagnostics!.consistencyScore}% consistency score, ${finalBrief._diagnostics!.extractionSummary.fromInput}/${finalBrief._diagnostics!.extractionSummary.total} entities from input`);
  return finalBrief;
}

// â”€â”€â”€ Claude Provider (disabled) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/*
async function generateWithClaude(rawInput: string): Promise<GeneratedBrief> {
  // ... kept for future use
}
*/

// â”€â”€â”€ Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function generateBrief(rawInput: string): Promise<GeneratedBrief> {
  const context = createPipelineContext(rawInput);
  return pipelineContext.run(context, async () => {
    resetLog();
    resetRegistry();
    _lastDiagnostics = null;
    _lastFallbackActivations = [];
    _lastRegenerationTriggers = [];
    _lastExtractionWarnings = [];
    _lastConsistencyViolations = [];
    _lastUnsupportedConcepts = [];
    _lastAnalysisInputs = {};
    _lastFinalReportInputs = {};
    log("start", "generateBrief called", { inputLength: rawInput.length, rawInput });
    try {
      const result = await generateWithGemini(rawInput);
      const fields = countExtractedFields(result);
      log("complete", "generateBrief completed", {
        confidence: result.confidenceScore,
        title: result.projectTitle,
        fieldsPresent: fields.present,
        fieldsTotal: fields.total,
        missingFields: fields.missing,
      });
      _lastDiagnostics = result._diagnostics || context.lastDiagnostics;
      return result;
    } catch (err) {
      log("complete", "Generation failed; no fallback report returned", { error: String(err) });
      throw err instanceof Error ? err : new Error("GENERATION_FAILED");
    }
  });
}

