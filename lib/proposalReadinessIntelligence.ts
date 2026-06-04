import type {
  AnalysisArtifact,
  DiagnosticInfo,
  GeneratedBrief,
  ProposalMissingInformationItem,
  ProposalReadinessIntelligence,
} from "@/types/brief";

type Importance = ProposalMissingInformationItem["importance"];

type GapSeed = {
  key: string;
  missingInformation: string;
  importance: Importance;
  whyItMatters: string;
  riskIntroduced: string;
  question: string;
  affectedArea: string;
  evidenceChecked: string[];
  reason: string;
  validationRule: string;
};

function textIncludesAny(value: string, terms: string[]): boolean {
  const text = value.toLowerCase();
  return terms.some(term => text.includes(term));
}

function hasMeaningfulValue(value?: string): boolean {
  if (!value) return false;
  return !/not specified|to be discussed|cannot estimate|unknown|requires clarification/i.test(value);
}

function valueOrMissing(value: unknown): string {
  if (value == null) return "missing";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "missing";
  const stringValue = String(value).trim();
  return stringValue.length > 0 ? stringValue : "missing";
}

function hasEvidenceValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasEvidenceValue);
  if (typeof value !== "string") return value != null;
  return hasMeaningfulValue(value);
}

function hasConcreteScope(brief: GeneratedBrief): boolean {
  return (brief.scopeIncluded || []).some(item => !/requires clarification|unknown|not specified/i.test(item));
}

function hasConcreteTimeline(brief: GeneratedBrief): boolean {
  return (brief.timeline || []).some(item => item.estimatedDays > 0 || !/not specified|to be determined|clarify/i.test(`${item.milestone} ${item.description}`));
}

function collectReportEvidence(brief: GeneratedBrief, diagnostics?: DiagnosticInfo): string {
  const artifact = diagnostics?.analysisArtifact;
  return [
    brief.projectSummary,
    brief.executiveSummary,
    brief.paymentTerms?.estimatedBudget,
    brief.confidenceReason,
    ...(brief.scopeIncluded || []),
    ...(brief.objectives || []),
    ...(brief.missingRequirements || []).map(item => item.requirement),
    ...(brief.discoveryQuestions || []).map(item => `${item.question} ${item.context}`),
    ...(brief.risks || []).map(item => `${item.risk} ${item.mitigation}`),
    ...(brief.proposalReadinessBreakdown?.requirements?.missing || []),
    ...(brief.proposalReadinessBreakdown?.technical?.missing || []),
    ...(brief.proposalReadinessBreakdown?.business?.missing || []),
    ...(brief.proposalReadinessBreakdown?.budget?.missing || []),
    ...(artifact?.requirements || []).map(item => item.value),
    ...(artifact?.systems || []).map(item => item.value),
    ...(artifact?.constraints || []).map(item => item.value),
    ...(artifact?.complianceSignals || []).map(item => item.value),
    ...(artifact?.diagnostics?.uncertainty || []),
  ].filter(Boolean).join(" \n ");
}

function evidenceChecked(entries: Array<[string, unknown]>): string[] {
  return entries.map(([label, value]) => `${label}: ${valueOrMissing(value)}`);
}

function diagnosticInputs(brief: GeneratedBrief, diagnostics?: DiagnosticInfo) {
  const artifact = diagnostics?.analysisArtifact;
  const analysisInputs = diagnostics?.analysisInputs || {};
  const technicalMissing = brief.proposalReadinessBreakdown?.technical?.missing || [];
  const requirementsMissing = brief.proposalReadinessBreakdown?.requirements?.missing || [];
  const budgetMissing = brief.proposalReadinessBreakdown?.budget?.missing || [];
  const businessMissing = brief.proposalReadinessBreakdown?.business?.missing || [];

  return {
    artifact,
    analysisInputs,
    technicalMissing,
    requirementsMissing,
    budgetMissing,
    businessMissing,
    missingRequirements: brief.missingRequirements || [],
    budgetEvidence: [
      brief.paymentTerms?.estimatedBudget,
      brief.budgetRealityCheck?.clientBudget,
      analysisInputs.extractedBudget,
      analysisInputs.budget,
    ].some(hasEvidenceValue),
    timelineEvidence: hasConcreteTimeline(brief) || [analysisInputs.extractedTimeline, analysisInputs.timeline].some(hasEvidenceValue),
    scopeEvidence: hasConcreteScope(brief) || (artifact?.requirements.length ?? 0) > 0 || (brief.deliverables || []).length > 0,
    userEvidence: (artifact?.actors.length ?? 0) > 0,
    technicalEvidence: (artifact?.systems.length ?? 0) > 0 || (brief.proposalReadinessBreakdown?.technical?.score ?? 0) >= 6,
    integrationEvidence: (artifact?.systems.length ?? 0) > 0 || textIncludesAny(collectReportEvidence(brief, diagnostics), ["api", "integration", "existing system", "legacy system", "third-party system"]),
    complianceEvidence: (artifact?.complianceSignals.length ?? 0) > 0,
  };
}

function addGap(gaps: Map<string, GapSeed>, gap: GapSeed): void {
  if (!gaps.has(gap.key)) gaps.set(gap.key, gap);
}

function inferGaps(brief: GeneratedBrief, diagnostics?: DiagnosticInfo): GapSeed[] {
  const gaps = new Map<string, GapSeed>();
  const checks = diagnosticInputs(brief, diagnostics);
  const artifact: AnalysisArtifact | undefined = checks.artifact;
  const evidence = collectReportEvidence(brief, diagnostics);
  const missingRequirements = checks.missingRequirements.map(item => item.requirement).join(" \n ");
  const technicalMissing = checks.technicalMissing.join(" \n ");
  const requirementsMissing = checks.requirementsMissing.join(" \n ");
  const budgetMissing = checks.budgetMissing.join(" \n ");
  const businessMissing = checks.businessMissing.join(" \n ");

  if (!checks.budgetEvidence) {
    addGap(gaps, {
      key: "budget",
      missingInformation: "Budget and commercial constraints",
      importance: "Critical",
      whyItMatters: "Proposal pricing, release planning, and scope trade-offs depend on a confirmed budget range.",
      riskIntroduced: "Pricing may be inaccurate or the proposed scope may exceed the client's available budget.",
      question: "What budget range or commercial constraints should the proposal be designed around?",
      affectedArea: "Pricing, Scope, Proposal Strategy",
      evidenceChecked: evidenceChecked([
        ["Payment terms estimated budget", brief.paymentTerms?.estimatedBudget],
        ["Budget reality check client budget", brief.budgetRealityCheck?.clientBudget],
        ["Analysis input extracted budget", checks.analysisInputs.extractedBudget],
        ["Budget readiness notes", budgetMissing],
      ]),
      reason: "No usable budget value was found in payment terms, budget analysis, or extraction diagnostics.",
      validationRule: "budgetEvidence === false",
    });
  }

  if (!checks.timelineEvidence) {
    addGap(gaps, {
      key: "timeline",
      missingInformation: "Target timeline or launch deadline",
      importance: "Critical",
      whyItMatters: "Delivery sequencing, team allocation, and feasibility depend on the required timeline.",
      riskIntroduced: "The proposal may commit to an unrealistic delivery plan or miss a critical launch constraint.",
      question: "What target launch date or delivery timeline should the proposal assume?",
      affectedArea: "Timeline, Staffing, Scope",
      evidenceChecked: evidenceChecked([
        ["Timeline milestones", (brief.timeline || []).map(item => `${item.milestone} (${item.estimatedDays} days)`)],
        ["Analysis input extracted timeline", checks.analysisInputs.extractedTimeline],
        ["Missing requirements", missingRequirements],
      ]),
      reason: "No concrete timeline, launch date, or extracted timeline value was found.",
      validationRule: "timelineEvidence === false",
    });
  }

  if (!checks.scopeEvidence) {
    addGap(gaps, {
      key: "scope",
      missingInformation: "Detailed scope and acceptance criteria",
      importance: "Critical",
      whyItMatters: "Scope boundaries and acceptance criteria determine what can be priced, delivered, and signed off.",
      riskIntroduced: "Ambiguous requirements can cause underestimation, rework, and scope creep.",
      question: "Which extracted requirements are must-haves for the first proposal, and what does successful completion mean for each?",
      affectedArea: "Scope, Timeline, Budget",
      evidenceChecked: evidenceChecked([
        ["Scope included", brief.scopeIncluded],
        ["Deliverables", (brief.deliverables || []).map(item => item.name)],
        ["Artifact requirements", artifact?.requirements.map(item => item.value)],
        ["Requirements readiness notes", requirementsMissing],
      ]),
      reason: "No concrete scope items, deliverables, or extracted requirements were found.",
      validationRule: "scopeEvidence === false",
    });
  }

  if (!checks.userEvidence && textIncludesAny(evidence, ["user roles are not explicit", "who are the primary user roles", "role clarity is required"])) {
    addGap(gaps, {
      key: "users",
      missingInformation: "Primary users, roles, and decision-makers",
      importance: "Critical",
      whyItMatters: "User roles drive permissions, workflows, approval paths, and stakeholder sign-off.",
      riskIntroduced: "The proposal may omit key workflows or underestimate access-control and approval complexity.",
      question: "Who are the primary user roles, decision-makers, and operational stakeholders for this system?",
      affectedArea: "Scope, UX, Permissions, Delivery Risk",
      evidenceChecked: evidenceChecked([
        ["Artifact actors", artifact?.actors.map(item => item.value)],
        ["Discovery questions", (brief.discoveryQuestions || []).map(item => item.question)],
        ["Artifact uncertainty", artifact?.diagnostics.uncertainty],
      ]),
      reason: "The artifact contains no actor extraction and the report already flags role clarity as a gap.",
      validationRule: "userEvidence === false && reportEvidence flags role ambiguity",
    });
  }

  if (!checks.technicalEvidence && textIncludesAny(`${missingRequirements} ${technicalMissing}`, ["technical", "architecture", "hosting", "infrastructure", "database", "stack"])) {
    addGap(gaps, {
      key: "technical",
      missingInformation: "Technical architecture and deployment requirements",
      importance: "Important",
      whyItMatters: "Architecture, hosting, infrastructure, and data design affect build effort, reliability, and operating cost.",
      riskIntroduced: "The proposal may underestimate implementation effort, infrastructure cost, or non-functional requirements.",
      question: "What architecture, hosting, data storage, and deployment requirements should the proposal account for?",
      affectedArea: "Architecture, Budget, Delivery",
      evidenceChecked: evidenceChecked([
        ["Artifact systems", artifact?.systems.map(item => item.value)],
        ["Technical readiness score", brief.proposalReadinessBreakdown?.technical?.score],
        ["Technical readiness notes", technicalMissing],
        ["Missing requirements", missingRequirements],
      ]),
      reason: "Technical readiness notes mention missing architecture/deployment details and no system evidence or high technical score was found.",
      validationRule: "technicalEvidence === false && technical gap text exists",
    });
  }

  const integrationIsRelevant = textIncludesAny(evidence, ["integration", "api", "existing system", "legacy", "third-party", "external system"]);
  if (integrationIsRelevant && !checks.integrationEvidence && textIncludesAny(technicalMissing, ["integration", "unclear"])) {
    addGap(gaps, {
      key: "integration",
      missingInformation: "Integration points and existing systems",
      importance: "Important",
      whyItMatters: "External systems, APIs, and current data sources determine architecture, testing effort, and delivery risk.",
      riskIntroduced: "Unknown integrations can create hidden dependencies, delays, and budget overruns.",
      question: "Which existing systems, APIs, or data sources must this project integrate with?",
      affectedArea: "Architecture, Timeline, Budget",
      evidenceChecked: evidenceChecked([
        ["Artifact systems", artifact?.systems.map(item => item.value)],
        ["Technical readiness notes", technicalMissing],
        ["Report evidence mentions integration", integrationIsRelevant ? "yes" : "no"],
      ]),
      reason: "The report indicates integration relevance but no concrete integration target or existing system was found.",
      validationRule: "integrationRelevant === true && integrationEvidence === false",
    });
  }

  const complianceIsRelevant = (artifact?.complianceSignals.length ?? 0) > 0 || textIncludesAny(`${missingRequirements} ${businessMissing}`, ["compliance", "privacy", "security", "approval", "regulation", "data residency"]);
  if (complianceIsRelevant && !checks.complianceEvidence) {
    addGap(gaps, {
      key: "compliance",
      missingInformation: "Compliance, security, privacy, and approval requirements",
      importance: "Important",
      whyItMatters: "Control, audit, privacy, and approval needs can materially change architecture, delivery scope, and sign-off.",
      riskIntroduced: "The proposal may omit mandatory controls or underestimate compliance-related effort.",
      question: "Which compliance, security, privacy, approval, or audit requirements are mandatory for launch?",
      affectedArea: "Compliance, Architecture, Delivery Risk",
      evidenceChecked: evidenceChecked([
        ["Artifact compliance signals", artifact?.complianceSignals.map(item => item.value)],
        ["Business readiness notes", businessMissing],
        ["Missing requirements", missingRequirements],
      ]),
      reason: "The report indicates compliance relevance, but no concrete compliance signal was extracted.",
      validationRule: "complianceRelevant === true && complianceEvidence === false",
    });
  }

  return Array.from(gaps.values());
}

function scoreFactor(value: boolean, partial = false): number {
  if (value) return 100;
  return partial ? 55 : 25;
}

function proposalConfidence(brief: GeneratedBrief, diagnostics: DiagnosticInfo | undefined, gaps: GapSeed[]): ProposalReadinessIntelligence["proposalConfidence"] {
  const checks = diagnosticInputs(brief, diagnostics);
  const artifact = checks.artifact;
  const evidence = collectReportEvidence(brief, diagnostics);
  const integrationIsRelevant = textIncludesAny(evidence, ["integration", "api", "existing system", "legacy", "third-party", "external system"]);
  const complianceIsRelevant = (artifact?.complianceSignals.length ?? 0) > 0 || textIncludesAny(evidence, ["compliance", "privacy", "security", "approval", "regulation", "data residency"]);

  const factors = {
    budget: scoreFactor(checks.budgetEvidence),
    timeline: scoreFactor(checks.timelineEvidence),
    scope: scoreFactor(checks.scopeEvidence, (brief.scopeIncluded || []).length > 0),
    users: scoreFactor(checks.userEvidence),
    technical: scoreFactor(checks.technicalEvidence, (brief.proposalReadinessBreakdown?.technical?.score ?? 0) >= 3),
    integration: integrationIsRelevant ? scoreFactor(!gaps.some(gap => gap.key === "integration")) : 100,
    compliance: complianceIsRelevant ? scoreFactor(!gaps.some(gap => gap.key === "compliance")) : 100,
  };

  const score = Math.round(Object.values(factors).reduce((sum, value) => sum + value, 0) / Object.values(factors).length);
  const positive = Object.entries(factors).filter(([, value]) => value >= 80).map(([key]) => key);
  const negative = gaps.slice(0, 3).map(gap => gap.missingInformation.toLowerCase());

  return {
    score,
    reasoning: [
      positive.length > 0 ? `Confidence is supported by ${positive.join(", ")} clarity.` : "",
      negative.length > 0 ? `Confidence is reduced by missing ${negative.join(", ")}.` : "No material proposal gaps were detected from the current report evidence.",
    ].filter(Boolean).join(" "),
  };
}

export function buildProposalReadinessIntelligence(brief: GeneratedBrief, diagnostics?: DiagnosticInfo): ProposalReadinessIntelligence {
  const gaps = inferGaps(brief, diagnostics);
  const criticalUnknowns = gaps
    .filter(gap => gap.importance === "Critical" || textIncludesAny(gap.affectedArea, ["timeline", "budget", "architecture", "compliance", "delivery risk", "scope"]))
    .slice(0, 6)
    .map(gap => ({
      unknown: gap.missingInformation,
      riskIntroduced: gap.riskIntroduced,
    }));

  const questionsForClient = gaps.map(gap => ({
    question: gap.question,
    reasonForAsking: gap.whyItMatters,
    affectedArea: gap.affectedArea,
    missingInformation: gap.missingInformation,
  }));

  return {
    hasMeaningfulGaps: gaps.length > 0,
    sufficientInformationMessage: "Current brief contains sufficient information for proposal generation.",
    missingInformation: gaps.map(gap => ({
      missingInformation: gap.missingInformation,
      importance: gap.importance,
      whyItMatters: gap.whyItMatters,
      evidenceChecked: gap.evidenceChecked,
      reason: gap.reason,
      validationRule: gap.validationRule,
    })),
    criticalUnknowns,
    questionsForClient,
    proposalConfidence: proposalConfidence(brief, diagnostics, gaps),
    discoveryCallFocusAreas: gaps
      .slice()
      .sort((a, b) => {
        const rank: Record<Importance, number> = { Critical: 0, Important: 1, Optional: 2 };
        return rank[a.importance] - rank[b.importance];
      })
      .slice(0, 5)
      .map(gap => gap.missingInformation),
  };
}
