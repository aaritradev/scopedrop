import type { GeneratedBrief, Priority, RiskLevel, RecommendedAction, PricingConfidenceLevel, ExtractionWarning } from "@/types/brief";
import { formatPercentScore, formatRatingScore, normalizePercentScore, normalizeRatingScore } from "@/lib/scoreUtils";

interface AnalysisTabProps {
  brief: GeneratedBrief;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "oklch(0.58 0.01 260)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function PriorityBadge({ priority }: { priority?: Priority }) {
  if (!priority) return null;
  const colors: Record<Priority, { bg: string; text: string }> = {
    CRITICAL: { bg: "oklch(0.6 0.15 25 / 0.15)", text: "oklch(0.6 0.15 25)" },
    IMPORTANT: { bg: "oklch(0.62 0.14 75 / 0.15)", text: "oklch(0.62 0.14 75)" },
    OPTIONAL: { bg: "oklch(0.58 0.01 260 / 0.15)", text: "oklch(0.58 0.01 260)" },
  };
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: colors[priority].bg, color: colors[priority].text }}
    >
      {priority}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    low: "oklch(0.45 0.1 145)",
    medium: "oklch(0.62 0.14 75)",
    high: "oklch(0.6 0.15 25)",
  };
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: colors[severity] + "20", color: colors[severity] }}
    >
      {severity}
    </span>
  );
}

function LevelBadge({ level }: { level: RiskLevel | PricingConfidenceLevel }) {
  const colors: Record<string, { bg: string; text: string }> = {
    Low: { bg: "oklch(0.45 0.1 145 / 0.2)", text: "oklch(0.45 0.1 145)" },
    Medium: { bg: "oklch(0.62 0.14 75 / 0.2)", text: "oklch(0.62 0.14 75)" },
    High: { bg: "oklch(0.6 0.15 25 / 0.2)", text: "oklch(0.6 0.15 25)" },
  };
  const c = colors[level] || colors.Medium;
  return (
    <span className="inline-block rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: c.bg, color: c.text }}>
      {level}
    </span>
  );
}

function ActionBadge({ action }: { action: RecommendedAction }) {
  const colors: Record<RecommendedAction, { bg: string; text: string }> = {
    Accept: { bg: "oklch(0.45 0.1 145 / 0.2)", text: "oklch(0.45 0.1 145)" },
    "Accept with Conditions": { bg: "oklch(0.62 0.14 75 / 0.2)", text: "oklch(0.62 0.14 75)" },
    "Discovery Call Required": { bg: "oklch(0.58 0.01 260 / 0.2)", text: "oklch(0.58 0.01 260)" },
    "Renegotiate Scope": { bg: "oklch(0.62 0.14 75 / 0.2)", text: "oklch(0.62 0.14 75)" },
    Decline: { bg: "oklch(0.6 0.15 25 / 0.2)", text: "oklch(0.6 0.15 25)" },
  };
  const c = colors[action];
  return (
    <span className="inline-block rounded-full px-3 py-1 text-sm font-bold" style={{ backgroundColor: c.bg, color: c.text }}>
      {action}
    </span>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const normalizedScore = normalizeRatingScore(score);
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-xs" style={{ color: "oklch(0.82 0.01 260)" }}>
        {label}
      </span>
      <div className="flex flex-1 gap-0.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <div
            key={n}
            className="h-2 flex-1 rounded-full"
            style={{
              backgroundColor:
                n <= normalizedScore ? "oklch(0.62 0.14 75)" : "oklch(0.22 0.035 260)",
            }}
          />
        ))}
      </div>
      <span className="tabular text-xs font-bold w-6 text-right" style={{ color: "oklch(0.62 0.14 75)" }}>
        {formatRatingScore(score)}
      </span>
    </div>
  );
}

function ImportanceBadge({ importance }: { importance: "Critical" | "Important" | "Optional" }) {
  const colors: Record<string, { bg: string; text: string }> = {
    Critical: { bg: "oklch(0.6 0.15 25 / 0.15)", text: "oklch(0.6 0.15 25)" },
    Important: { bg: "oklch(0.62 0.14 75 / 0.15)", text: "oklch(0.62 0.14 75)" },
    Optional: { bg: "oklch(0.58 0.01 260 / 0.15)", text: "oklch(0.58 0.01 260)" },
  };
  const color = colors[importance] || colors.Optional;
  return (
    <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: color.bg, color: color.text }}>
      {importance}
    </span>
  );
}

export function AnalysisTab({ brief }: AnalysisTabProps) {
  const profitabilityScore = normalizeRatingScore(brief.profitabilityScore?.score);
  const confidenceScore = normalizePercentScore(brief.confidenceScore);

  return (
    <div className="prose-brief space-y-8">
      {/* PROJECT DECISION — most important section, always first */}
      {brief.projectDecision && (
        <Section title="Recommended Action">
          <div className="card-base p-5">
            <ActionBadge action={brief.projectDecision.action} />
            <p className="text-sm mt-3 leading-relaxed" style={{ color: "oklch(0.82 0.01 260)" }}>
              {brief.projectDecision.reasoning}
            </p>
          </div>
        </Section>
      )}

      {/* Profitability Score */}
      {brief.profitabilityScore && (
        <Section title="Profitability Score">
          <div className="card-base p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative h-16 w-16">
                <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="oklch(0.22 0.035 260)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke={profitabilityScore >= 7 ? "oklch(0.45 0.1 145)" : profitabilityScore >= 4 ? "oklch(0.62 0.14 75)" : "oklch(0.6 0.15 25)"}
                    strokeWidth="3"
                    strokeDasharray={`${(profitabilityScore / 10) * 97.4} 97.4`}
                    strokeLinecap="round"
                  />
                  <text x="18" y="20" textAnchor="middle" fontSize="8" fontWeight="bold" fill="oklch(0.93 0.005 260)">
                    {formatRatingScore(brief.profitabilityScore.score)}
                  </text>
                </svg>
              </div>
              <p className="text-xs flex-1 leading-relaxed" style={{ color: "oklch(0.58 0.01 260)" }}>
                {brief.profitabilityScore.explanation}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {brief.profitabilityScore.pros?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "oklch(0.45 0.1 145)" }}>Pros</p>
                  <ul className="space-y-1">
                    {brief.profitabilityScore.pros.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "oklch(0.82 0.01 260)" }}>
                        <span style={{ color: "oklch(0.45 0.1 145)" }}>+</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {brief.profitabilityScore.cons?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "oklch(0.6 0.15 25)" }}>Cons</p>
                  <ul className="space-y-1">
                    {brief.profitabilityScore.cons.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "oklch(0.82 0.01 260)" }}>
                        <span style={{ color: "oklch(0.6 0.15 25)" }}>−</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* Client Type Classification */}
      {brief.clientTypeClassification && (
        <Section title="Client Type">
          <div className="card-base p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-bold" style={{ color: "oklch(0.93 0.005 260)" }}>
                {brief.clientTypeClassification.type}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 rounded-lg" style={{ backgroundColor: "oklch(0.22 0.035 260 / 0.5)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.58 0.01 260)" }}>Buying Behavior</p>
                <p className="text-xs" style={{ color: "oklch(0.82 0.01 260)" }}>{brief.clientTypeClassification.buyingBehavior}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: "oklch(0.22 0.035 260 / 0.5)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.58 0.01 260)" }}>Risk Profile</p>
                <p className="text-xs" style={{ color: "oklch(0.82 0.01 260)" }}>{brief.clientTypeClassification.riskProfile}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: "oklch(0.22 0.035 260 / 0.5)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.58 0.01 260)" }}>Decision Speed</p>
                <p className="text-xs" style={{ color: "oklch(0.82 0.01 260)" }}>{brief.clientTypeClassification.decisionSpeed}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ backgroundColor: "oklch(0.22 0.035 260 / 0.5)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.58 0.01 260)" }}>Scope Change Likelihood</p>
                <p className="text-xs" style={{ color: "oklch(0.82 0.01 260)" }}>{brief.clientTypeClassification.scopeChangeLikelihood}</p>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* Negotiation Strategy */}
      {brief.negotiationStrategy && (
        <Section title="Negotiation Strategy">
          <div className="card-base p-5 space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "oklch(0.45 0.1 145)" }}>Recommended Position</p>
              <p className="text-sm" style={{ color: "oklch(0.93 0.005 260)" }}>{brief.negotiationStrategy.recommendedPosition}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "oklch(0.6 0.15 25)" }}>Avoid</p>
              <p className="text-sm" style={{ color: "oklch(0.93 0.005 260)" }}>{brief.negotiationStrategy.avoid}</p>
            </div>
            {brief.negotiationStrategy.talkingPoints?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "oklch(0.58 0.01 260)" }}>Suggested Talking Points</p>
                <ul className="space-y-1.5">
                  {brief.negotiationStrategy.talkingPoints.map((tp, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "oklch(0.82 0.01 260)" }}>
                      <span style={{ color: "oklch(0.62 0.14 75)" }}>→</span>{tp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Budget Reality Check */}
      {brief.budgetRealityCheck && (
        <Section title="Budget Reality Check">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card-base p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.58 0.01 260)" }}>Estimated Market Cost</p>
              <p className="text-lg font-bold" style={{ color: "oklch(0.93 0.005 260)" }}>{brief.budgetRealityCheck.estimatedMarketCost}</p>
            </div>
            <div className="card-base p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.58 0.01 260)" }}>Client Budget</p>
              <p className="text-lg font-bold" style={{ color: "oklch(0.93 0.005 260)" }}>{brief.budgetRealityCheck.clientBudget}</p>
            </div>
            <div className="card-base p-4" style={{ border: "1px solid oklch(0.6 0.15 25 / 0.3)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.6 0.15 25)" }}>Gap</p>
              <p className="text-lg font-bold" style={{ color: "oklch(0.6 0.15 25)" }}>{brief.budgetRealityCheck.gap}</p>
            </div>
          </div>
          <div className="card-base mt-3 p-4" style={{ backgroundColor: "oklch(0.62 0.14 75 / 0.06)" }}>
            <p className="text-xs font-medium" style={{ color: "oklch(0.93 0.005 260)" }}>Recommendation:</p>
            <p className="text-xs mt-1" style={{ color: "oklch(0.82 0.01 260)" }}>{brief.budgetRealityCheck.recommendation}</p>
          </div>
        </Section>
      )}

      {/* Pricing Guidance */}
      {brief.pricingGuidance && (
        <Section title="Pricing Guidance">
          <div className="card-base p-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "oklch(0.58 0.01 260)" }}>Pricing Confidence:</span>
              <LevelBadge level={brief.pricingGuidance.confidence} />
            </div>
            <p className="text-xs mt-2" style={{ color: "oklch(0.58 0.01 260)" }}>{brief.pricingGuidance.confidenceReason}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="card-base p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.58 0.01 260)" }}>Suggested Fixed Price</p>
              <p className="text-base font-bold" style={{ color: "oklch(0.93 0.005 260)" }}>{brief.pricingGuidance.suggestedFixedPrice}</p>
            </div>
            <div className="card-base p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.58 0.01 260)" }}>Hourly Equivalent</p>
              <p className="text-base font-bold" style={{ color: "oklch(0.93 0.005 260)" }}>{brief.pricingGuidance.suggestedHourlyEquivalent}</p>
            </div>
            <div className="card-base p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.58 0.01 260)" }}>Suggested MVP Price</p>
              <p className="text-base font-bold" style={{ color: "oklch(0.93 0.005 260)" }}>{brief.pricingGuidance.suggestedMVPPrice}</p>
            </div>
            <div className="card-base p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.58 0.01 260)" }}>Retainer Opportunity</p>
              <p className="text-base font-bold" style={{ color: "oklch(0.93 0.005 260)" }}>{brief.pricingGuidance.suggestedRetainerOpportunity}</p>
            </div>
          </div>
        </Section>
      )}

      {/* Project Failure Risk */}
      {brief.projectFailureRisk && (
        <Section title="Project Failure Risk">
          <div className="card-base p-5">
            <div className="flex items-center gap-3 mb-3">
              <LevelBadge level={brief.projectFailureRisk.level} />
            </div>
            {brief.projectFailureRisk.factors?.length > 0 && (
              <ul className="space-y-1.5 mb-3">
                {brief.projectFailureRisk.factors.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "oklch(0.82 0.01 260)" }}>
                    <span style={{ color: "oklch(0.62 0.14 75)" }}>•</span>{f}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs" style={{ color: "oklch(0.58 0.01 260)" }}>{brief.projectFailureRisk.explanation}</p>
          </div>
        </Section>
      )}

      {/* Proposal Strategy */}
      {brief.proposalStrategy?.length > 0 && (
        <Section title="Recommended Proposal Strategy">
          <p className="text-xs mb-4" style={{ color: "oklch(0.58 0.01 260)" }}>Phased approach to avoid overcommitting.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {brief.proposalStrategy.map((phase, i) => (
              <div key={i} className="card-base p-4">
                <div className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-3" style={{ backgroundColor: "oklch(0.62 0.14 75 / 0.15)", color: "oklch(0.62 0.14 75)" }}>
                  {phase.name}
                </div>
                <ul className="space-y-1.5">
                  {phase.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs" style={{ color: "oklch(0.82 0.01 260)" }}>
                      <span style={{ color: "oklch(0.62 0.14 75)" }}>→</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Deal Killers */}
      {brief.dealKillers?.length > 0 && (
        <Section title="Deal Killers Before Signing">
          <p className="text-xs mb-4" style={{ color: "oklch(0.6 0.15 25)" }}>These must be clarified before accepting the project.</p>
          <div className="space-y-2">
            {brief.dealKillers.map((k, i) => (
              <div key={i} className="card-base flex items-start gap-3 p-4" style={{ borderLeft: "3px solid oklch(0.6 0.15 25)" }}>
                <span className="text-sm font-bold shrink-0" style={{ color: "oklch(0.6 0.15 25)" }}>{String(i + 1).padStart(2, "0")}</span>
                <p className="text-sm" style={{ color: "oklch(0.82 0.01 260)" }}>{k}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Client Risk Score */}
      {brief.clientRiskScore && (
        <Section title="Client Risk Score">
          <div className="card-base p-4">
            <LevelBadge level={brief.clientRiskScore.level} />
            <p className="text-xs mt-3" style={{ color: "oklch(0.58 0.01 260)" }}>{brief.clientRiskScore.explanation}</p>
          </div>
        </Section>
      )}

      {/* Client Response Draft */}
      {brief.clientResponseDraft && (
        <Section title="Suggested Client Response">
          <div className="card-base p-5" style={{ borderLeft: "3px solid oklch(0.62 0.14 75)" }}>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "oklch(0.82 0.01 260)" }}>
              {brief.clientResponseDraft}
            </p>
          </div>
        </Section>
      )}

      {/* Discovery Questions */}
      {brief.discoveryQuestions?.length > 0 && (
        <Section title="Discovery Questions">
          <p className="text-xs mb-4" style={{ color: "oklch(0.58 0.01 260)" }}>Ask before sending a proposal — sorted by priority.</p>
          <div className="space-y-3">
            {brief.discoveryQuestions
              .slice()
              .sort((a, b) => {
                const order: Record<string, number> = { CRITICAL: 0, IMPORTANT: 1, OPTIONAL: 2 };
                return (order[a.priority || "OPTIONAL"] || 2) - (order[b.priority || "OPTIONAL"] || 2);
              })
              .map((q, i) => (
                <div key={i} className="card-base p-4">
                  <div className="flex items-start gap-3">
                    <PriorityBadge priority={q.priority} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1" style={{ color: "oklch(0.93 0.005 260)" }}>{q.question}</p>
                      <p className="text-xs" style={{ color: "oklch(0.58 0.01 260)" }}>{q.context}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Section>
      )}

      {/* Risks */}
      {brief.risks?.length > 0 && (
        <Section title="Risks & Dependencies">
          <div className="space-y-3">
            {brief.risks
              .slice()
              .sort((a, b) => {
                const order: Record<string, number> = { CRITICAL: 0, IMPORTANT: 1, OPTIONAL: 2 };
                return (order[a.priority || "OPTIONAL"] || 2) - (order[b.priority || "OPTIONAL"] || 2);
              })
              .map((r, i) => (
                <div key={i} className="card-base p-4" style={{ borderLeft: "3px solid", borderColor: r.severity === "high" ? "oklch(0.6 0.15 25)" : r.severity === "medium" ? "oklch(0.62 0.14 75)" : "oklch(0.45 0.1 145)" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <SeverityBadge severity={r.severity} />
                    <PriorityBadge priority={r.priority} />
                  </div>
                  <p className="text-sm mb-1" style={{ color: "oklch(0.82 0.01 260)" }}>{r.risk}</p>
                  <p className="text-xs" style={{ color: "oklch(0.58 0.01 260)" }}>Mitigation: {r.mitigation}</p>
                </div>
              ))}
          </div>
        </Section>
      )}

      {/* Scope Creep Warnings */}
      {brief.scopeCreepWarnings?.length > 0 && (
        <Section title="Scope Creep Warnings">
          <div className="space-y-3">
            {brief.scopeCreepWarnings.map((w, i) => (
              <div key={i} className="card-base p-4" style={{ borderLeft: "3px solid", borderColor: "oklch(0.62 0.14 75)" }}>
                <p className="text-sm font-medium mb-1" style={{ color: "oklch(0.93 0.005 260)" }}>{w.warning}</p>
                <p className="text-xs" style={{ color: "oklch(0.58 0.01 260)" }}>{w.why}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Missing Requirements */}
      {brief.missingRequirements?.length > 0 && (
        <Section title="Missing Requirements">
          <p className="text-xs mb-3" style={{ color: "oklch(0.58 0.01 260)" }}>The client did not mention these but will likely need them.</p>
          <div className="space-y-2">
            {brief.missingRequirements
              .slice()
              .sort((a, b) => {
                const order: Record<string, number> = { CRITICAL: 0, IMPORTANT: 1, OPTIONAL: 2 };
                return (order[a.priority || "OPTIONAL"] || 2) - (order[b.priority || "OPTIONAL"] || 2);
              })
              .map((req, i) => (
                <div key={i} className="card-base flex items-start gap-3 p-3">
                  <PriorityBadge priority={req.priority} />
                  <p className="text-sm flex-1" style={{ color: "oklch(0.82 0.01 260)" }}>{req.requirement}</p>
                </div>
              ))}
          </div>
        </Section>
      )}

      {/* Upsell Opportunities */}
      {brief.upsellOpportunities?.length > 0 && (
        <Section title="Upsell Opportunities">
          <div className="space-y-3">
            {brief.upsellOpportunities.map((u, i) => (
              <div key={i} className="card-base p-4" style={{ borderLeft: "3px solid", borderColor: "oklch(0.45 0.1 145)" }}>
                <p className="text-sm font-medium mb-1" style={{ color: "oklch(0.93 0.005 260)" }}>{u.service}</p>
                <p className="text-xs" style={{ color: "oklch(0.58 0.01 260)" }}>{u.rationale}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Effort Analysis */}
      {brief.effortAnalysis && (
        <Section title="Effort Analysis">
          <div className="card-base p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-semibold" style={{ color: "oklch(0.93 0.005 260)" }}>Complexity:</span>
              <LevelBadge level={brief.effortAnalysis.complexity as RiskLevel} />
            </div>
            {brief.effortAnalysis.breakdown?.length > 0 && (
              <ul className="space-y-1">
                {brief.effortAnalysis.breakdown.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "oklch(0.58 0.01 260)" }}>
                    <span>•</span>{b}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      )}

      {/* Proposal Readiness Breakdown */}
      {brief.proposalReadinessBreakdown && (
        <Section title="Proposal Readiness">
          <div className="card-base p-5 space-y-4">
            {(["requirements", "technical", "business", "budget"] as const).map((key) => {
              const cat = brief.proposalReadinessBreakdown[key];
              const labels: Record<string, string> = { requirements: "Requirements Clarity", technical: "Technical Clarity", business: "Business Clarity", budget: "Budget Clarity" };
              return (
                <div key={key}>
                  <ScoreBar label={labels[key]} score={cat.score} />
                  {cat.missing?.length > 0 && (
                    <ul className="ml-36 mt-1.5 space-y-0.5">
                      {cat.missing.map((m, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: "oklch(0.58 0.01 260)" }}>
                          <span>−</span>{m}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            <div className="border-t pt-3" style={{ borderColor: "oklch(0.22 0.035 260)" }}>
              <ScoreBar label="Overall Readiness" score={brief.proposalReadinessBreakdown.overallReadiness} />
            </div>
            {brief.proposalReadinessBreakdown.explanation && (
              <p className="text-xs" style={{ color: "oklch(0.58 0.01 260)" }}>{brief.proposalReadinessBreakdown.explanation}</p>
            )}
          </div>
        </Section>
      )}

      {/* Confidence Score */}
      {brief.confidenceScore != null && (
        <Section title="Analysis Confidence">
          <div className="card-base p-4">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12">
                <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="oklch(0.22 0.035 260)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke={confidenceScore >= 70 ? "oklch(0.45 0.1 145)" : confidenceScore >= 40 ? "oklch(0.62 0.14 75)" : "oklch(0.6 0.15 25)"}
                    strokeWidth="3"
                    strokeDasharray={`${(confidenceScore / 100) * 97.4} 97.4`}
                    strokeLinecap="round"
                  />
                  <text x="18" y="20" textAnchor="middle" fontSize="7" fontWeight="bold" fill="oklch(0.93 0.005 260)">
                    {formatPercentScore(brief.confidenceScore)}
                  </text>
                </svg>
              </div>
              <p className="text-xs flex-1" style={{ color: "oklch(0.58 0.01 260)" }}>{brief.confidenceReason}</p>
            </div>
          </div>
        </Section>
      )}

      {/* Numerical Validation */}
      {brief.numericalValidation && (
        <Section title="Numerical Validation">
          <div className="card-base p-4">
            {brief.numericalValidation.isValid ? (
              <p className="text-xs font-medium" style={{ color: "oklch(0.45 0.1 145)" }}>✓ All numbers check out.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium" style={{ color: "oklch(0.6 0.15 25)" }}>⚠ Warnings found:</p>
                {brief.numericalValidation.warnings?.map((w, i) => (
                  <p key={i} className="text-xs" style={{ color: "oklch(0.58 0.01 260)" }}>• {w}</p>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Extraction Warnings */}
      {brief.extractionWarnings && brief.extractionWarnings.length > 0 && (
        <Section title="Extraction Quality">
          <p className="text-xs mb-3" style={{ color: "oklch(0.58 0.01 260)" }}>
            How well each field was extracted from the client message.
          </p>
          <div className="space-y-1.5">
            {brief.extractionWarnings.map((w, i) => {
              const statusColor =
                w.status === "ok" ? "oklch(0.45 0.1 145)" :
                w.status === "partial" ? "oklch(0.62 0.14 75)" :
                "oklch(0.6 0.15 25)";
              const dot = w.status === "ok" ? "●" : w.status === "partial" ? "◐" : "○";
              return (
                <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "oklch(0.82 0.01 260)" }}>
                  <span style={{ color: statusColor }}>{dot}</span>
                  <span className="w-28 shrink-0 font-medium capitalize" style={{ color: statusColor }}>{w.field}</span>
                  <span>{w.message}</span>
                </div>
              );
            })}
          </div>
          {(() => {
            const ok = brief.extractionWarnings.filter(w => w.status === "ok").length;
            const partial = brief.extractionWarnings.filter(w => w.status === "partial").length;
            const missing = brief.extractionWarnings.filter(w => w.status === "missing").length;
            const total = brief.extractionWarnings.length;
            const pct = Math.round((ok / total) * 100);
            return (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "oklch(0.22 0.035 260)" }}>
                  {ok > 0 && <div className="h-full rounded-full" style={{ width: `${(ok / total) * 100}%`, backgroundColor: "oklch(0.45 0.1 145)" }} />}
                  {partial > 0 && <div className="h-full rounded-full" style={{ width: `${(partial / total) * 100}%`, backgroundColor: "oklch(0.62 0.14 75)" }} />}
                  {missing > 0 && <div className="h-full rounded-full" style={{ width: `${(missing / total) * 100}%`, backgroundColor: "oklch(0.6 0.15 25)" }} />}
                </div>
                <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: "oklch(0.58 0.01 260)" }}>
                  {ok} ok · {partial} partial · {missing} missing · {pct}%
                </span>
              </div>
            );
          })()}
        </Section>
      )}

      {/* Proposal Readiness Intelligence */}
      {brief.proposalReadinessIntelligence && (
        <Section title="Proposal Readiness Intelligence">
          {!brief.proposalReadinessIntelligence.hasMeaningfulGaps ? (
            <div className="card-base p-5">
              <p className="text-sm" style={{ color: "oklch(0.82 0.01 260)" }}>
                {brief.proposalReadinessIntelligence.sufficientInformationMessage}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "oklch(0.58 0.01 260)" }}>Missing Information</h3>
                <div className="space-y-3">
                  {brief.proposalReadinessIntelligence.missingInformation.map((item, i) => (
                    <div key={i} className="card-base p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold" style={{ color: "oklch(0.93 0.005 260)" }}>{item.missingInformation}</p>
                        <ImportanceBadge importance={item.importance} />
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "oklch(0.58 0.01 260)" }}>{item.whyItMatters}</p>
                      <div className="mt-3 rounded-lg p-3" style={{ backgroundColor: "oklch(0.22 0.035 260 / 0.45)" }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "oklch(0.62 0.14 75)" }}>Diagnostic</p>
                        <p className="mt-1 text-[11px]" style={{ color: "oklch(0.82 0.01 260)" }}>Reason: {item.reason}</p>
                        <p className="mt-1 text-[11px]" style={{ color: "oklch(0.58 0.01 260)" }}>Rule: {item.validationRule}</p>
                        {item.evidenceChecked.length > 0 && (
                          <ul className="mt-2 space-y-0.5">
                            {item.evidenceChecked.map((evidence, evidenceIndex) => (
                              <li key={evidenceIndex} className="text-[11px]" style={{ color: "oklch(0.58 0.01 260)" }}>• {evidence}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {brief.proposalReadinessIntelligence.criticalUnknowns.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "oklch(0.58 0.01 260)" }}>Critical Unknowns</h3>
                  <div className="space-y-3">
                    {brief.proposalReadinessIntelligence.criticalUnknowns.map((item, i) => (
                      <div key={i} className="card-base p-4" style={{ borderLeft: "3px solid oklch(0.6 0.15 25)" }}>
                        <p className="mb-1 text-sm font-semibold" style={{ color: "oklch(0.93 0.005 260)" }}>{item.unknown}</p>
                        <p className="text-xs leading-relaxed" style={{ color: "oklch(0.58 0.01 260)" }}>{item.riskIntroduced}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {brief.proposalReadinessIntelligence.questionsForClient.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "oklch(0.58 0.01 260)" }}>Questions For Client</h3>
                  <div className="space-y-3">
                    {brief.proposalReadinessIntelligence.questionsForClient.map((item, i) => (
                      <div key={i} className="card-base p-4">
                        <p className="mb-2 text-sm font-semibold" style={{ color: "oklch(0.93 0.005 260)" }}>{item.question}</p>
                        <p className="text-xs" style={{ color: "oklch(0.58 0.01 260)" }}>Reason: {item.reasonForAsking}</p>
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-wider" style={{ color: "oklch(0.62 0.14 75)" }}>Affected Area: {item.affectedArea}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "oklch(0.58 0.01 260)" }}>Proposal Confidence</h3>
                <div className="card-base p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl font-bold tabular" style={{ color: "oklch(0.93 0.005 260)" }}>
                      {formatPercentScore(brief.proposalReadinessIntelligence.proposalConfidence.score)}
                    </span>
                    <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: "oklch(0.22 0.035 260)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${normalizePercentScore(brief.proposalReadinessIntelligence.proposalConfidence.score)}%`,
                          backgroundColor: "oklch(0.62 0.14 75)",
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "oklch(0.58 0.01 260)" }}>{brief.proposalReadinessIntelligence.proposalConfidence.reasoning}</p>
                </div>
              </div>

              {brief.proposalReadinessIntelligence.discoveryCallFocusAreas.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "oklch(0.58 0.01 260)" }}>Discovery Call Focus Areas</h3>
                  <div className="card-base p-4">
                    <ol className="space-y-2">
                      {brief.proposalReadinessIntelligence.discoveryCallFocusAreas.map((area, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "oklch(0.82 0.01 260)" }}>
                          <span className="tabular text-xs font-bold" style={{ color: "oklch(0.62 0.14 75)" }}>{i + 1}</span>
                          <span>{area}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
