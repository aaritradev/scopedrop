export type Priority = "CRITICAL" | "IMPORTANT" | "OPTIONAL";
export type RiskSeverity = "low" | "medium" | "high";
export type Complexity = "Low" | "Medium" | "High" | "Very High";
export type RiskLevel = "Low" | "Medium" | "High";
export type PricingConfidenceLevel = "High" | "Medium" | "Low";
export type RecommendedAction = "Accept" | "Accept with Conditions" | "Discovery Call Required" | "Renegotiate Scope" | "Decline";

export interface Deliverable {
  name: string;
  description: string;
  format: string;
  duePhase: string;
}

export interface TimelineMilestone {
  milestone: string;
  description: string;
  estimatedDays: number;
}

export interface PaymentTerms {
  estimatedBudget: string;
  deposit: string;
  milestonePayments: string[];
  finalPayment: string;
  structureLabel?: string;
}

export interface DiscoveryQuestion {
  question: string;
  context: string;
  priority?: Priority;
}

export interface Risk {
  risk: string;
  severity: RiskSeverity;
  mitigation: string;
  priority?: Priority;
}

export interface ScopeCreepWarning {
  warning: string;
  why: string;
}

export interface UpsellOpportunity {
  service: string;
  rationale: string;
}

export interface EffortAnalysis {
  complexity: Complexity;
  breakdown: string[];
}

export interface NumericalValidation {
  isValid: boolean;
  warnings: string[];
}

export interface BudgetRealityCheck {
  estimatedMarketCost: string;
  clientBudget: string;
  gap: string;
  recommendation: string;
}

export interface ProposalPhase {
  name: string;
  items: string[];
}

export interface ReadinessCategory {
  score: number;
  missing: string[];
}

export interface ProposalReadinessBreakdown {
  requirements: ReadinessCategory;
  technical: ReadinessCategory;
  business: ReadinessCategory;
  budget: ReadinessCategory;
  overallReadiness: number;
  explanation: string;
}

export interface ClientRiskScore {
  level: RiskLevel;
  explanation: string;
}

export interface MissingRequirement {
  requirement: string;
  priority: Priority;
  whyItMatters?: string;
  proposalImpact?: string;
}

export interface ProposalReadySummary {
  projectOverview: string;
  likelyDeliverables: string[];
  timelineRecommendation: string;
  pricingRecommendation: string;
  majorAssumptions: string[];
  suggestedEngagementApproach: string;
}

export interface ClientWinProbability {
  probability: number;
  reasoning: string;
  positiveIndicators: string[];
  concerns: string[];
  negotiationAdvice: string;
}

export interface ClientSeriousnessScore {
  score: number;
  explanation: string;
  signals: string[];
}

export interface PricingGuidance {
  suggestedFixedPrice: string;
  suggestedHourlyEquivalent: string;
  suggestedMVPPrice: string;
  suggestedRetainerOpportunity: string;
  confidence: PricingConfidenceLevel;
  confidenceReason: string;
}

export interface ProfitabilityScore {
  score: number;
  pros: string[];
  cons: string[];
  explanation: string;
}

export interface NegotiationStrategy {
  recommendedPosition: string;
  avoid: string;
  talkingPoints: string[];
}

export interface ClientTypeClassification {
  type: string;
  buyingBehavior: string;
  riskProfile: string;
  decisionSpeed: string;
  scopeChangeLikelihood: string;
}

export interface ProjectFailureRisk {
  level: RiskLevel;
  factors: string[];
  explanation: string;
}

export interface ProjectDecision {
  action: RecommendedAction;
  reasoning: string;
}

export interface ProposalMissingInformationItem {
  missingInformation: string;
  importance: "Critical" | "Important" | "Optional";
  whyItMatters: string;
  evidenceChecked: string[];
  reason: string;
  validationRule: string;
}

export interface ProposalCriticalUnknown {
  unknown: string;
  riskIntroduced: string;
}

export interface ProposalClientQuestion {
  question: string;
  reasonForAsking: string;
  affectedArea: string;
  missingInformation: string;
}

export interface ProposalReadinessIntelligence {
  hasMeaningfulGaps: boolean;
  sufficientInformationMessage: string;
  missingInformation: ProposalMissingInformationItem[];
  criticalUnknowns: ProposalCriticalUnknown[];
  questionsForClient: ProposalClientQuestion[];
  proposalConfidence: {
    score: number;
    reasoning: string;
  };
  discoveryCallFocusAreas: string[];
}

export interface ExtractionWarning {
  field: string;
  status: "ok" | "missing" | "partial";
  message: string;
}

export interface ConsistencyViolation {
  section: string;
  detail: string;
  severity: "high" | "medium" | "low";
}

// ─── Source Attribution ─────────────────────────────────────────────────────

export type EntitySource = "client_input" | "inferred" | "generated" | "fallback";

export interface SourceAttribution {
  source: EntitySource;
  confidence: number;
  evidence?: string;
}

export interface EntityEntry {
  id: string;
  value: string;
  category: string;
  attribution: SourceAttribution;
}

export interface AttributedValue {
  value: string;
  source: EntitySource;
  confidence: number;
  evidence: string[];
}

export interface AnalysisRequirement extends AttributedValue {
  category: "functional" | "operational" | "technical" | "business" | "compliance" | "unknown";
}

export interface AnalysisRisk extends AttributedValue {
  severity: RiskSeverity;
  mitigation?: string;
}

export interface AnalysisArtifact {
  domainProfile: {
    industry: AttributedValue;
    businessModel: AttributedValue;
    operatingContext: AttributedValue[];
    confidence: number;
  };
  actors: AttributedValue[];
  workflows: AttributedValue[];
  systems: AttributedValue[];
  requirements: AnalysisRequirement[];
  constraints: AttributedValue[];
  complianceSignals: AttributedValue[];
  risks: AnalysisRisk[];
  unsupportedConcepts: AttributedValue[];
  diagnostics: {
    extractionMode: "evidence_first";
    rawEvidenceCount: number;
    requirementCount: number;
    inferredCount: number;
    uncertainty: string[];
  };
}

export interface DiagnosticInfo {
  rawInput: string;
  analysisArtifact?: AnalysisArtifact;
  entities: EntityEntry[];
  projectClassification: {
    type: string;
    confidence: number;
    evidence: string[];
  };
  extractedIndustryDomain: SourceAttribution & {
    value: string;
  };
  extractedRequirements: EntityEntry[];
  validationResults: {
    extractionWarnings: ExtractionWarning[];
    consistencyViolations: ConsistencyViolation[];
    unsupportedConcepts: EntityEntry[];
  };
  classificationConfidence: number;
  analysisInputs: Record<string, unknown>;
  finalReportInputs: Record<string, unknown>;
  fallbackActivations: string[];
  domainConfidence: number;
  consistencyScore: number;
  unsupportedConcepts: EntityEntry[];
  regenerations: string[];
  regenerationTriggers: string[];
  extractionSummary: {
    total: number;
    fromInput: number;
    inferred: number;
    generated: number;
    fallback: number;
  };
  consistencyViolations: ConsistencyViolation[];
  verificationPass: {
    performed: boolean;
    inconsistencies: string[];
    resolved: boolean;
  };
  summary: {
    detectedDomain: string;
    domainConfidence: number;
    extractedEntityCount: number;
    unsupportedConceptCount: number;
    fallbackActivationCount: number;
    regenerationTriggerCount: number;
  };
}

// ─── Brief Result ───────────────────────────────────────────────────────────

export interface GeneratedBrief {
  projectTitle: string;
  clientName: string;
  projectSummary: string;
  executiveSummary: string;
  objectives: string[];
  scopeIncluded: string[];
  scopeExcluded: string[];
  assumptions: string[];
  deliverables: Deliverable[];
  timeline: TimelineMilestone[];
  paymentTerms: PaymentTerms;
  nextSteps: string[];
  redFlags: string[];
  confidenceScore: number;
  confidenceReason?: string;
  discoveryQuestions: DiscoveryQuestion[];
  risks: Risk[];
  scopeCreepWarnings: ScopeCreepWarning[];
  missingRequirements: MissingRequirement[];
  upsellOpportunities: UpsellOpportunity[];
  effortAnalysis: EffortAnalysis;
  proposalReadinessBreakdown: ProposalReadinessBreakdown;
  numericalValidation: NumericalValidation;
  budgetRealityCheck: BudgetRealityCheck;
  proposalStrategy: ProposalPhase[];
  dealKillers: string[];
  clientRiskScore: ClientRiskScore;
  pricingGuidance: PricingGuidance;
  profitabilityScore: ProfitabilityScore;
  negotiationStrategy: NegotiationStrategy;
  clientTypeClassification: ClientTypeClassification;
  projectFailureRisk: ProjectFailureRisk;
  projectDecision: ProjectDecision;
  clientResponseDraft: string;
  proposalReadySummary?: ProposalReadySummary;
  clientWinProbability?: ClientWinProbability;
  clientSeriousnessScore?: ClientSeriousnessScore;
  proposalReadinessIntelligence?: ProposalReadinessIntelligence;
  extractionWarnings?: ExtractionWarning[];
  _diagnostics?: DiagnosticInfo;
}
