import type { AnalysisArtifact, AnalysisRequirement, AnalysisRisk, AttributedValue, EntitySource } from "@/types/brief";

const weakEvidenceWords = new Set([
  "app",
  "build",
  "client",
  "create",
  "development",
  "feature",
  "features",
  "management",
  "need",
  "needs",
  "platform",
  "project",
  "software",
  "system",
  "tool",
  "want",
  "wants",
]);

const structuralLabelPattern = /^(?:requirements?|we would also like|future initiatives?|timeline|budget|location|locations|scale|scope|objectives?|deliverables?|risks?|constraints?|assumptions?|users?|actors?|roles?|systems?|workflows?|processes?|dependencies?|notes?|overview|summary|background|phase\s*\d+|next steps?)$/i;
const scalarMetadataPattern = /^(?:budget|timeline|deadline|location|locations|scale|users?|markets?|countries?|region|regions?)\s*:/i;
const semanticRequirementSignalPattern = /\b(?:need|needs|want|wants|must|should|include|includes|requires?|support|supports|allow|allows|enable|enables|manage|track|create|upload|approve|approval|approvals|schedule|record|records?|report|reports?|workflow|process|processing|planning|integration|module|capability|feature|dashboard|portal|system|app|automate|capture|review|update|assign|notify)\b/i;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripLineMarker(value: string): string {
  return normalizeWhitespace(value).replace(/^[-*•\d.)\s]+/, "");
}

function normalizedLabel(value: string): string {
  return normalizeWhitespace(value)
    .replace(/^#+\s*/, "")
    .replace(/[:\-–—]+$/g, "")
    .trim();
}

function isStructuralLabel(value: string): boolean {
  const cleaned = normalizedLabel(stripLineMarker(value));
  if (!cleaned) return true;
  if (structuralLabelPattern.test(cleaned)) return true;
  const words = cleaned.split(/\s+/).filter(Boolean);
  return /[:\-–—]$/.test(normalizeWhitespace(value)) && words.length <= 5 && !/\d|₹|â‚¹|\$|€|£/.test(cleaned) && !semanticRequirementSignalPattern.test(cleaned);
}

function stripStructuralPrefix(value: string): string {
  const cleaned = stripLineMarker(value);
  const match = cleaned.match(/^([^:]{1,60}):\s*(.+)$/);
  if (!match) return cleaned;

  const label = normalizedLabel(match[1]);
  if (structuralLabelPattern.test(label) || label.split(/\s+/).length <= 5) {
    return normalizeWhitespace(match[2]);
  }

  return cleaned;
}

function isScalarMetadataLine(value: string): boolean {
  return scalarMetadataPattern.test(stripLineMarker(value));
}

function sentenceCase(value: string): string {
  const trimmed = stripLineMarker(value);
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function uniqueByValue<T extends { value: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function attributed(value: string, source: EntitySource, confidence: number, evidence: string[]): AttributedValue {
  return {
    value: sentenceCase(value),
    source,
    confidence: Math.max(0, Math.min(1, confidence)),
    evidence: evidence.map(normalizeWhitespace).filter(Boolean),
  };
}

function tokenize(text: string): string[] {
  return Array.from(new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s/-]/g, " ")
      .split(/\s+/)
      .filter(token => token.length > 2 && !weakEvidenceWords.has(token)),
  ));
}

function cleanCandidate(value: string): string {
  return normalizeWhitespace(value)
    .replace(/^[-*:.)\d\s]+/, "")
    .replace(/^(?:a|an|the)\s+/i, "")
    .replace(/\b(?:need|needs|want|wants|requires?|should|must)\b.*$/i, "")
    .replace(/\b(?:app|platform|system|software|portal|tool|dashboard|website|service|operation|operations|workflow|workflows)\b$/i, "")
    .replace(/\b(?:for|to|with|that|which|where|using|including|include|includes)\b.*$/i, "")
    .trim();
}

function meaningfulCandidate(value: string): boolean {
  const tokens = tokenize(value);
  if (tokens.length === 0) return false;
  if (tokens.length > 8) return false;
  return tokens.some(token => !weakEvidenceWords.has(token));
}

function evidenceLines(rawInput: string): string[] {
  const lineCandidates = rawInput
    .split(/\r?\n/)
    .map(normalizeWhitespace)
    .filter(line => line.length > 0);

  const lines = lineCandidates.flatMap(line => {
    const cleaned = stripLineMarker(line);
    if (isStructuralLabel(cleaned)) return [];
    if (cleaned.length > 180 && /[,;]| and | with /i.test(cleaned)) {
      return cleaned.split(/[,;]|\band\b|\bwith\b/i).map(normalizeWhitespace);
    }
    return [cleaned];
  });

  return uniqueByValue(
    lines
      .filter(line => line.length >= 4)
      .filter(line => !/^(hi|hello|thanks|regards|please)$/i.test(line))
      .map(value => ({ value })),
  ).map(item => item.value);
}

function inferIndustry(rawInput: string, lines: string[]): AttributedValue {
  const text = rawInput.trim();
  const explicitPatterns = [
    /\b([a-z][a-z\s/&-]{3,80}?)\s+(?:needs|wants|requires)\s+(?:a|an|the)?\s*(?:app|platform|system|software|portal|tool|dashboard|website|service)\b/i,
    /\b(?:for|build|create|develop|need|needs|want|wants)\s+(?:a|an|the)?\s*([a-z][a-z\s/&-]{3,80}?)(?:\s+(?:app|platform|system|software|portal|tool|dashboard|website|service))\b/i,
    /\b([a-z][a-z\s/&-]{3,80}?)\s+(?:operations|management|platform|system|software|portal|workflow|workflows)\b/i,
    /\b(?:industry|domain|sector)\s*(?:is|:|-)\s*([a-z][a-z\s/&-]{3,80})/i,
    /\b(?:organization|company|business|team)\s+(?:does|handles|runs|operates|provides|manages|supports)\s+([a-z][a-z\s/&-]{3,80})/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = cleanCandidate(match[1].replace(/\b(management|operations|digital|custom|new|internal|external)$/i, ""));
      if (meaningfulCandidate(value)) {
        return attributed(value, "client_input", 0.82, [match[0]]);
      }
    }
  }

  const sourceLine = lines.find(line => /\b(?:does|operates|handles|manages|supports|serves|provides|builds|runs)\b/i.test(line));
  if (sourceLine) {
    const candidate = cleanCandidate(sourceLine.replace(/^.*?\b(?:does|operates|handles|manages|supports|serves|provides|builds|runs)\b/i, ""));
    if (meaningfulCandidate(candidate)) {
      return attributed(candidate, "inferred", 0.52, [sourceLine]);
    }
  }

  return attributed("Domain requires clarification", "fallback", 0.2, []);
}

function inferBusinessModel(rawInput: string, industry: AttributedValue): AttributedValue {
  const operationMatch = rawInput.match(/\b(?:used by|for|supports|helps|enables)\s+([a-z][a-z\s/&-]{3,80}?)(?:\s+(?:to|for|with|by)\s+([a-z][a-z\s/&-]{3,120}))?[.;,\n]/i);
  if (operationMatch?.[0]) {
    return attributed(`Operating model described by source workflow: ${normalizeWhitespace(operationMatch[0])}`, "client_input", 0.68, [operationMatch[0]]);
  }

  if (industry.source !== "fallback") {
    return attributed(`Workflow model for ${industry.value} needs confirmation`, "inferred", 0.4, industry.evidence);
  }

  return attributed("Operating model requires clarification", "fallback", 0.2, []);
}

function requirementCategory(value: string): AnalysisRequirement["category"] {
  if (/\b(compliance|audit|regulation|approval|policy|permission|security|privacy|legal|control)\b/i.test(value)) return "compliance";
  if (/\b(api|integration|database|hosting|mobile|web|portal|dashboard|architecture|infrastructure)\b/i.test(value)) return "technical";
  if (/\b(revenue|pricing|budget|cost|sales|commercial|business)\b/i.test(value)) return "business";
  if (/\b(workflow|operation|process|schedule|assign|track|record|order|handoff|status)\b/i.test(value)) return "operational";
  if (/\b(create|manage|upload|generate|view|approve|notify|register|submit|review|update|capture)\b/i.test(value)) return "functional";
  return "unknown";
}

function extractRequirements(lines: string[]): AnalysisRequirement[] {
  const requirementLines = lines
    .map(line => ({ original: line, semantic: stripStructuralPrefix(line) }))
    .filter(({ original, semantic }) => {
      if (isStructuralLabel(original) || isStructuralLabel(semantic)) return false;
      if (isScalarMetadataLine(original)) return false;
      if (semantic.length < 5 || semantic.length > 180) return false;
      return semanticRequirementSignalPattern.test(semantic);
    });

  return uniqueByValue(requirementLines.map(({ original, semantic }) => ({
    ...attributed(semantic.replace(/^(?:need|needs|want|wants|must|should|include|includes|requires?)\s+/i, ""), "client_input", 0.82, [original]),
    category: requirementCategory(semantic),
  } satisfies AnalysisRequirement))).slice(0, 18);
}

function extractActors(lines: string[]): AttributedValue[] {
  const actors: AttributedValue[] = [];
  const patterns = [
    /\b(?:for|used by|users include|roles include|roles are|user roles are)\s+([a-z][a-z\s/&-]{2,70})/gi,
    /\b([a-z][a-z\s/&-]{2,50}?)\s+(?:can|will|should|must|need|needs|manage|create|approve|view|submit|track|receive|send|update)\b/gi,
  ];

  for (const line of lines) {
    if (isStructuralLabel(line)) continue;
    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(line)) !== null) {
        const candidates = match[1].split(/\s*(?:,|\/| and | or )\s*/i).map(cleanCandidate);
        for (const candidate of candidates) {
          if (meaningfulCandidate(candidate)) actors.push(attributed(candidate, "client_input", 0.68, [line]));
        }
      }
    }
  }

  return uniqueByValue(actors).slice(0, 12);
}

function extractWorkflows(requirements: AnalysisRequirement[]): AttributedValue[] {
  return requirements
    .filter(req => !isStructuralLabel(req.value))
    .filter(req => req.category === "operational" || /\bworkflow|process|planning|handoff|status|schedule|approve|approval|track|manage\b/i.test(req.value))
    .map(req => attributed(req.value, req.source, Math.min(0.9, req.confidence), req.evidence))
    .slice(0, 10);
}

function extractSystems(lines: string[]): AttributedValue[] {
  const systems: AttributedValue[] = [];
  const systemPattern = /\b([a-z][a-z\s/&-]{0,50}?\s+(?:app|platform|system|software|portal|dashboard|website|tool|database|api|service))\b/gi;
  for (const line of lines) {
    if (isStructuralLabel(line)) continue;
    let match: RegExpExecArray | null;
    while ((match = systemPattern.exec(line)) !== null) {
      const candidate = cleanCandidate(match[1]);
      if (meaningfulCandidate(candidate)) systems.push(attributed(match[1], "client_input", 0.72, [line]));
    }
  }
  return uniqueByValue(systems).slice(0, 10);
}

function extractConstraints(lines: string[]): AttributedValue[] {
  return lines
    .filter(line => !isStructuralLabel(line))
    .filter(line => /\b(budget|timeline|deadline|within|before|must|constraint|limited|phase|mvp|launch|scale|users?|locations?|markets?|countries?|regions?)\b/i.test(line))
    .map(line => attributed(line, "client_input", 0.78, [line]))
    .slice(0, 10);
}

function extractCompliance(lines: string[]): AttributedValue[] {
  return lines
    .filter(line => !isStructuralLabel(line))
    .filter(line => /\b(compliance|audit|regulation|approval|privacy|security|permission|role-based|data|policy|legal|control|retention|access)\b/i.test(line))
    .map(line => attributed(line, "client_input", 0.72, [line]))
    .slice(0, 10);
}

function inferRisks(artifactDraft: Pick<AnalysisArtifact, "requirements" | "constraints" | "complianceSignals">): AnalysisRisk[] {
  const risks: AnalysisRisk[] = [];

  if (artifactDraft.requirements.length === 0) {
    risks.push({
      ...attributed("Requirements are not specific enough to scope implementation safely", "inferred", 0.7, []),
      severity: "high",
      mitigation: "Run a discovery call focused on workflows, actors, data, and acceptance criteria",
    });
  }

  if (artifactDraft.complianceSignals.length > 0) {
    risks.push({
      ...attributed("Compliance and data-handling requirements may affect scope, architecture, and delivery timeline", "inferred", 0.72, artifactDraft.complianceSignals.flatMap(signal => signal.evidence).slice(0, 3)),
      severity: "medium",
      mitigation: "Clarify applicable policies, approvals, audit needs, and access controls before pricing",
    });
  }

  if (artifactDraft.constraints.some(c => /deadline|timeline|within|launch/i.test(c.value)) && artifactDraft.requirements.length > 8) {
    risks.push({
      ...attributed("Timeline may be tight for the number of requested workflows", "inferred", 0.68, artifactDraft.constraints.flatMap(signal => signal.evidence).slice(0, 2)),
      severity: "medium",
      mitigation: "Prioritize a smaller first release and defer lower-confidence workflows",
    });
  }

  return risks;
}

export function buildAnalysisArtifact(rawInput: string): AnalysisArtifact {
  const lines = evidenceLines(rawInput);
  const industry = inferIndustry(rawInput, lines);
  const businessModel = inferBusinessModel(rawInput, industry);
  const requirements = extractRequirements(lines);
  const actors = extractActors(lines);
  const workflows = extractWorkflows(requirements);
  const systems = extractSystems(lines);
  const constraints = extractConstraints(lines);
  const complianceSignals = extractCompliance(lines);
  const risks = inferRisks({ requirements, constraints, complianceSignals });
  const inferredCount = [businessModel, ...workflows, ...risks].filter(item => item.source === "inferred").length;
  const uncertainty: string[] = [];

  if (industry.confidence < 0.6) uncertainty.push("Industry/domain needs confirmation");
  if (requirements.length === 0) uncertainty.push("No concrete requirements were extracted");
  if (actors.length === 0) uncertainty.push("User roles are not explicit");
  if (workflows.length === 0) uncertainty.push("Operational workflows need clarification");

  return {
    domainProfile: {
      industry,
      businessModel,
      operatingContext: uniqueByValue([...actors, ...systems, ...constraints]).slice(0, 12),
      confidence: Math.round(((industry.confidence * 0.45) + (requirements.length > 0 ? 0.35 : 0) + (actors.length > 0 ? 0.1 : 0) + (workflows.length > 0 ? 0.1 : 0)) * 100),
    },
    actors,
    workflows,
    systems,
    requirements,
    constraints,
    complianceSignals,
    risks,
    unsupportedConcepts: [],
    diagnostics: {
      extractionMode: "evidence_first",
      rawEvidenceCount: lines.length,
      requirementCount: requirements.length,
      inferredCount,
      uncertainty,
    },
  };
}
