import { jsPDF } from "jspdf";
import type { GeneratedBrief } from "@/types/brief";
import { formatPercentScore, formatRatingScore } from "./scoreUtils";

const ORANGE = "#ff9500";
const DARK = "#1a1a1a";
const GRAY = "#666";

export function exportBriefPDF(brief: GeneratedBrief): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 50;
  const margin = 50;
  const maxW = pageW - margin * 2;

  function wrap(text: string, size: number): string[] {
    doc.setFontSize(size);
    return doc.splitTextToSize(text, maxW);
  }

  function addSection(title: string) {
    if (y > 700) { doc.addPage(); y = 50; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(ORANGE);
    doc.text(title.toUpperCase(), margin, y);
    y += 6;
    doc.setDrawColor(ORANGE);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  }

  function addBody(text: string, size = 9, color = DARK) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lines = wrap(text, size);
    for (const line of lines) {
      if (y > 760) { doc.addPage(); y = 50; }
      doc.text(line, margin, y);
      y += size * 1.4;
    }
  }

  function addBullets(items: string[], size = 9, prefix = "•") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(DARK);
    for (const item of items) {
      if (y > 760) { doc.addPage(); y = 50; }
      doc.text(`${prefix} ${item}`, margin, y);
      y += size * 1.6;
    }
  }

  function addKeyValue(label: string, value: string) {
    if (y > 760) { doc.addPage(); y = 50; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(DARK);
    doc.text(label, margin, y);
    const labelW = doc.getTextWidth(label);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRAY);
    doc.text(value, margin + labelW + 4, y);
    y += 14;
  }

  // Header bar
  doc.setFillColor(ORANGE);
  doc.rect(0, 0, pageW, 4, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(DARK);
  doc.text(brief.projectTitle, margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(GRAY);
  doc.text(`Client: ${brief.clientName}`, margin, y);
  y += 24;

  // Divider
  doc.setDrawColor("#ddd");
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 20;

  // Project Decision — most important, first in PDF
  if (brief.projectDecision) {
    addSection("Recommended Action");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(ORANGE);
    doc.text(brief.projectDecision.action, margin, y);
    y += 16;
    addBody(brief.projectDecision.reasoning, 9);
  }

  if (brief.proposalReadySummary) {
    y += 4;
    addSection("Proposal Ready Summary");
    addBody(`Overview: ${brief.proposalReadySummary.projectOverview}`, 9, DARK);
    if (brief.proposalReadySummary.likelyDeliverables.length) {
      addBody("Likely Deliverables:", 9, DARK);
      addBullets(brief.proposalReadySummary.likelyDeliverables, 8, "-");
    }
    addBody(`Timeline Recommendation: ${brief.proposalReadySummary.timelineRecommendation}`, 8, GRAY);
    addBody(`Pricing Recommendation: ${brief.proposalReadySummary.pricingRecommendation}`, 8, GRAY);
    if (brief.proposalReadySummary.majorAssumptions.length) {
      addBody("Major Assumptions:", 9, DARK);
      addBullets(brief.proposalReadySummary.majorAssumptions, 8, "-");
    }
    addBody(`Engagement Approach: ${brief.proposalReadySummary.suggestedEngagementApproach}`, 8, DARK);
  }

  if (brief.clientWinProbability || brief.clientSeriousnessScore) {
    y += 4;
    addSection("Client Qualification");
    if (brief.clientWinProbability) {
      addBody(`Win Probability: ${formatPercentScore(brief.clientWinProbability.probability)}`, 10, DARK);
      addBody(brief.clientWinProbability.reasoning, 8, GRAY);
      if (brief.clientWinProbability.positiveIndicators.length) addBullets(brief.clientWinProbability.positiveIndicators, 8, "+");
      if (brief.clientWinProbability.concerns.length) addBullets(brief.clientWinProbability.concerns, 8, "-");
      addBody(`Negotiation Advice: ${brief.clientWinProbability.negotiationAdvice}`, 8, DARK);
    }
    if (brief.clientSeriousnessScore) {
      addBody(`Client Seriousness Score: ${formatRatingScore(brief.clientSeriousnessScore.score)}`, 10, DARK);
      addBody(brief.clientSeriousnessScore.explanation, 8, GRAY);
      if (brief.clientSeriousnessScore.signals.length) addBullets(brief.clientSeriousnessScore.signals, 8, "-");
    }
  }

  // Profitability Score
  if (brief.profitabilityScore) {
    y += 4;
    addSection("Profitability Score");
    addBody(`Score: ${formatRatingScore(brief.profitabilityScore.score)}`, 10, DARK);
    if (brief.profitabilityScore.pros?.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor("#2e7d32");
      doc.text("Pros:", margin, y); y += 12;
      addBullets(brief.profitabilityScore.pros, 9, "+");
    }
    if (brief.profitabilityScore.cons?.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor("#cc0000");
      doc.text("Cons:", margin, y); y += 12;
      addBullets(brief.profitabilityScore.cons, 9, "−");
    }
    if (brief.profitabilityScore.explanation) {
      addBody(brief.profitabilityScore.explanation, 9, GRAY);
    }
  }

  // Client Type
  if (brief.clientTypeClassification) {
    y += 4;
    addSection("Client Type");
    addBody(`Type: ${brief.clientTypeClassification.type}`, 9, DARK);
    addBody(`Buying Behavior: ${brief.clientTypeClassification.buyingBehavior}`, 9, GRAY);
    addBody(`Risk Profile: ${brief.clientTypeClassification.riskProfile}`, 9, GRAY);
    addBody(`Decision Speed: ${brief.clientTypeClassification.decisionSpeed}`, 9, GRAY);
    addBody(`Scope Change Likelihood: ${brief.clientTypeClassification.scopeChangeLikelihood}`, 9, GRAY);
  }

  // Negotiation Strategy
  if (brief.negotiationStrategy) {
    y += 4;
    addSection("Negotiation Strategy");
    addBody(`Recommended Position: ${brief.negotiationStrategy.recommendedPosition}`, 9, DARK);
    addBody(`Avoid: ${brief.negotiationStrategy.avoid}`, 9, "#cc0000");
    if (brief.negotiationStrategy.talkingPoints?.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(DARK);
      doc.text("Talking Points:", margin, y); y += 12;
      addBullets(brief.negotiationStrategy.talkingPoints, 9, "→");
    }
  }

  // Project Summary
  addSection("Project Summary");
  addBody(brief.projectSummary);

  // Objectives
  y += 4;
  addSection("Objectives");
  addBullets(brief.objectives);

  // Scope
  y += 4;
  addSection("Scope — Included");
  addBullets(brief.scopeIncluded, 9, "✓");

  y += 4;
  addSection("Scope — Excluded");
  addBullets(brief.scopeExcluded, 9, "✗");

  y += 4;
  addSection("Assumptions");
  addBullets(brief.assumptions, 9, "⚠");

  // Deliverables
  y += 4;
  addSection("Deliverables");
  for (const d of brief.deliverables) {
    if (y > 740) { doc.addPage(); y = 50; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(DARK);
    doc.text(d.name, margin, y); y += 12;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRAY);
    doc.text(`${d.description} — Format: ${d.format} / ${d.duePhase}`, margin, y); y += 14;
  }

  // Timeline
  y += 4;
  addSection("Timeline");
  for (const t of brief.timeline) {
    if (y > 740) { doc.addPage(); y = 50; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(DARK);
    doc.text(`${t.milestone} (${t.estimatedDays} days)`, margin, y); y += 12;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRAY);
    doc.text(t.description, margin, y); y += 14;
  }

  // Payment
  y += 4;
  addSection("Payment Terms");
  if (brief.paymentTerms.structureLabel) addBody(brief.paymentTerms.structureLabel, 10, ORANGE);
  addBody(`Estimated Budget: ${brief.paymentTerms.estimatedBudget}`, 9);
  addBody(`Deposit: ${brief.paymentTerms.deposit}`, 9);
  addBullets(brief.paymentTerms.milestonePayments, 9);
  addBody(`Final Payment: ${brief.paymentTerms.finalPayment}`, 9);

  // Next Steps
  if (brief.nextSteps?.length) {
    y += 4;
    addSection("Next Steps");
    addBullets(brief.nextSteps, 9);
  }

  // Red Flags
  y += 4;
  addSection("Red Flags");
  addBullets(brief.redFlags, 9, "⚠");

  // Executive Summary
  if (brief.executiveSummary) {
    y += 4;
    addSection("Executive Summary");
    addBody(brief.executiveSummary, 9);
  }

  // Budget Reality Check
  if (brief.budgetRealityCheck) {
    y += 4;
    addSection("Budget Reality Check");
    addKeyValue("Market Cost:", brief.budgetRealityCheck.estimatedMarketCost);
    addKeyValue("Client Budget:", brief.budgetRealityCheck.clientBudget);
    addKeyValue("Gap:", brief.budgetRealityCheck.gap);
    addBody(`Recommendation: ${brief.budgetRealityCheck.recommendation}`, 9, DARK);
  }

  // Pricing Guidance
  if (brief.pricingGuidance) {
    y += 4;
    addSection("Pricing Guidance");
    addKeyValue("Confidence:", brief.pricingGuidance.confidence);
    addBody(brief.pricingGuidance.confidenceReason, 9, GRAY);
    addKeyValue("Fixed Price:", brief.pricingGuidance.suggestedFixedPrice);
    addKeyValue("Hourly Equivalent:", brief.pricingGuidance.suggestedHourlyEquivalent);
    addKeyValue("MVP Price:", brief.pricingGuidance.suggestedMVPPrice);
    addKeyValue("Retainer:", brief.pricingGuidance.suggestedRetainerOpportunity);
  }

  // Project Failure Risk
  if (brief.projectFailureRisk) {
    y += 4;
    addSection("Project Failure Risk");
    addBody(`Risk Level: ${brief.projectFailureRisk.level}`, 9, DARK);
    if (brief.projectFailureRisk.factors?.length) {
      addBullets(brief.projectFailureRisk.factors, 9, "•");
    }
    addBody(brief.projectFailureRisk.explanation, 9, GRAY);
  }

  // Proposal Strategy
  if (brief.proposalStrategy?.length) {
    y += 4;
    addSection("Proposal Strategy");
    for (const phase of brief.proposalStrategy) {
      if (y > 740) { doc.addPage(); y = 50; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(ORANGE);
      doc.text(phase.name, margin, y); y += 12;
      for (const item of phase.items) {
        if (y > 760) { doc.addPage(); y = 50; }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(DARK);
        doc.text(`→ ${item}`, margin + 8, y); y += 11;
      }
      y += 4;
    }
  }

  // Deal Killers
  if (brief.dealKillers?.length) {
    y += 4;
    addSection("Deal Killers Before Signing");
    addBullets(brief.dealKillers, 9, "✗");
  }

  // Client Risk Score
  if (brief.clientRiskScore) {
    y += 4;
    addSection("Client Risk Score");
    addBody(`Risk Level: ${brief.clientRiskScore.level}`, 9, DARK);
    addBody(brief.clientRiskScore.explanation, 9, GRAY);
  }

  // Client Response Draft
  if (brief.clientResponseDraft) {
    y += 4;
    addSection("Suggested Client Response");
    addBody(brief.clientResponseDraft, 9, DARK);
  }

  // Discovery Questions
  if (brief.discoveryQuestions?.length) {
    y += 4;
    addSection("Discovery Questions");
    const sorted = [...brief.discoveryQuestions].sort((a, b) => {
      const order: Record<string, number> = { CRITICAL: 0, IMPORTANT: 1, OPTIONAL: 2 };
      return (order[a.priority || "OPTIONAL"] || 2) - (order[b.priority || "OPTIONAL"] || 2);
    });
    for (const q of sorted) {
      if (y > 740) { doc.addPage(); y = 50; }
      const tag = q.priority ? `[${q.priority}] ` : "";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(DARK);
      doc.text(`${tag}${q.question}`, margin, y); y += 12;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(GRAY);
      doc.text(q.context, margin, y); y += 14;
    }
  }

  // Risks
  if (brief.risks?.length) {
    y += 4;
    addSection("Risks & Dependencies");
    const sortedRisks = [...brief.risks].sort((a, b) => {
      const order: Record<string, number> = { CRITICAL: 0, IMPORTANT: 1, OPTIONAL: 2 };
      return (order[a.priority || "OPTIONAL"] || 2) - (order[b.priority || "OPTIONAL"] || 2);
    });
    for (const r of sortedRisks) {
      if (y > 740) { doc.addPage(); y = 50; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(r.severity === "high" ? "#cc0000" : r.severity === "medium" ? "#cc6600" : "#2e7d32");
      const tag = r.priority ? `[${r.priority}] ` : "";
      doc.text(`${tag}[${r.severity.toUpperCase()}] ${r.risk}`, margin, y); y += 12;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(GRAY);
      doc.text(`Mitigation: ${r.mitigation}`, margin, y); y += 14;
    }
  }

  // Scope Creep Warnings
  if (brief.scopeCreepWarnings?.length) {
    y += 4;
    addSection("Scope Creep Warnings");
    for (const w of brief.scopeCreepWarnings) {
      if (y > 740) { doc.addPage(); y = 50; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(DARK);
      doc.text(w.warning, margin, y); y += 12;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(GRAY);
      doc.text(w.why, margin, y); y += 14;
    }
  }

  // Missing Requirements
  if (brief.missingRequirements?.length) {
    y += 4;
    addSection("Missing Requirements");
    const sortedReq = [...brief.missingRequirements].sort((a, b) => {
      const order: Record<string, number> = { CRITICAL: 0, IMPORTANT: 1, OPTIONAL: 2 };
      return (order[a.priority || "OPTIONAL"] || 2) - (order[b.priority || "OPTIONAL"] || 2);
    });
    for (const req of sortedReq) {
      if (y > 760) { doc.addPage(); y = 50; }
      const tag = req.priority ? `[${req.priority}] ` : "";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(DARK);
      doc.text(`→ ${tag}${req.requirement}`, margin, y); y += 12;
    }
  }

  // Upsell Opportunities
  if (brief.upsellOpportunities?.length) {
    y += 4;
    addSection("Upsell Opportunities");
    for (const u of brief.upsellOpportunities) {
      if (y > 740) { doc.addPage(); y = 50; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(DARK);
      doc.text(u.service, margin, y); y += 12;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(GRAY);
      doc.text(u.rationale, margin, y); y += 14;
    }
  }

  // Effort Analysis
  if (brief.effortAnalysis) {
    y += 4;
    addSection("Effort Analysis");
    addBody(`Complexity: ${brief.effortAnalysis.complexity}`, 9);
    if (brief.effortAnalysis.breakdown?.length) {
      addBullets(brief.effortAnalysis.breakdown, 9);
    }
  }

  // Proposal Readiness Breakdown
  if (brief.proposalReadinessBreakdown) {
    y += 4;
    addSection("Proposal Readiness");
    const p = brief.proposalReadinessBreakdown;
    const labels = ["Requirements", "Technical", "Business", "Budget"] as const;
    const keys = ["requirements", "technical", "business", "budget"] as const;
    for (let i = 0; i < keys.length; i++) {
      const cat = p[keys[i]];
      addKeyValue(`${labels[i]} Clarity:`, formatRatingScore(cat.score));
      if (cat.missing?.length) {
        for (const m of cat.missing) {
          if (y > 760) { doc.addPage(); y = 50; }
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(GRAY);
          doc.text(`  − ${m}`, margin + 8, y); y += 10;
        }
      }
    }
    addKeyValue("Overall:", formatRatingScore(p.overallReadiness));
    if (p.explanation) addBody(p.explanation, 9, GRAY);
  }

  // Analysis Confidence
  if (brief.confidenceScore != null) {
    y += 4;
    addSection("Analysis Confidence");
    addBody(`Confidence: ${formatPercentScore(brief.confidenceScore)}`, 9);
    if (brief.confidenceReason) addBody(brief.confidenceReason, 9, GRAY);
  }

  // Numerical Validation
  if (brief.numericalValidation) {
    y += 4;
    addSection("Numerical Validation");
    if (brief.numericalValidation.isValid) {
      addBody("All numbers check out.", 9, "#2e7d32");
    } else if (brief.numericalValidation.warnings?.length) {
      addBullets(brief.numericalValidation.warnings, 9, "⚠");
    }
  }

  // Proposal Readiness Intelligence
  if (brief.proposalReadinessIntelligence) {
    y += 4;
    addSection("Proposal Readiness Intelligence");
    const intelligence = brief.proposalReadinessIntelligence;
    if (!intelligence.hasMeaningfulGaps) {
      addBody(intelligence.sufficientInformationMessage, 9);
    } else {
      if (intelligence.missingInformation.length) {
        addBody("Missing Information", 10, DARK);
        for (const item of intelligence.missingInformation) {
          addBody(`${item.missingInformation} (${item.importance})`, 9, DARK);
          addBody(item.whyItMatters, 8, GRAY);
          addBody(`Reason: ${item.reason}`, 8, GRAY);
          addBody(`Rule: ${item.validationRule}`, 8, GRAY);
          if (item.evidenceChecked.length) addBullets(item.evidenceChecked, 8, "-");
        }
      }
      if (intelligence.criticalUnknowns.length) {
        addBody("Critical Unknowns", 10, DARK);
        for (const item of intelligence.criticalUnknowns) {
          addBody(`${item.unknown}: ${item.riskIntroduced}`, 8, GRAY);
        }
      }
      if (intelligence.questionsForClient.length) {
        addBody("Questions For Client", 10, DARK);
        for (const item of intelligence.questionsForClient) {
          addBody(item.question, 9, DARK);
          addBody(`Reason: ${item.reasonForAsking}`, 8, GRAY);
          addBody(`Affected Area: ${item.affectedArea}`, 8, ORANGE);
        }
      }
      addBody(`Proposal Confidence: ${formatPercentScore(intelligence.proposalConfidence.score)}`, 10, DARK);
      addBody(intelligence.proposalConfidence.reasoning, 8, GRAY);
      if (intelligence.discoveryCallFocusAreas.length) {
        addBody("Discovery Call Focus Areas", 10, DARK);
        addBullets(intelligence.discoveryCallFocusAreas, 9, "•");
      }
    }
  }

  // Footer
  if (y > 740) { doc.addPage(); y = 50; }
  doc.setDrawColor("#ddd");
  doc.setLineWidth(0.5);
  doc.line(margin, y + 10, pageW - margin, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(GRAY);
  doc.text("Generated by ScopeDrop — scope drop.app", margin, y + 26);

  return doc;
}
