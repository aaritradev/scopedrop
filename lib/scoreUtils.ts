import type { GeneratedBrief } from "@/types/brief";

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function normalizeRatingScore(value: unknown): number {
  const score = asFiniteNumber(value);
  if (score == null) return 0;
  if (score > 20 && score <= 100) return roundToOneDecimal(score / 10);
  if (score > 10) return 10;
  if (score > 0 && score <= 1) return roundToOneDecimal(score * 10);
  return roundToOneDecimal(Math.max(0, Math.min(10, score)));
}

export function normalizePercentScore(value: unknown): number {
  const score = asFiniteNumber(value);
  if (score == null) return 0;
  if (score > 0 && score <= 1) return Math.round(score * 100);
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function formatRatingScore(value: unknown): string {
  return `${normalizeRatingScore(value)}/10`;
}

export function formatPercentScore(value: unknown): string {
  return `${normalizePercentScore(value)}%`;
}

export function normalizeBriefMetrics(brief: GeneratedBrief): string[] {
  const warnings: string[] = [];

  const originalConfidence = brief.confidenceScore;
  brief.confidenceScore = normalizePercentScore(brief.confidenceScore);
  if (originalConfidence !== brief.confidenceScore) {
    warnings.push(`Confidence normalized from ${originalConfidence} to ${brief.confidenceScore}%`);
  }

  if (brief.profitabilityScore) {
    const original = brief.profitabilityScore.score;
    brief.profitabilityScore.score = normalizeRatingScore(original);
    if (original !== brief.profitabilityScore.score) {
      warnings.push(`Profitability score normalized from ${original} to ${brief.profitabilityScore.score}/10`);
    }
    brief.profitabilityScore.explanation = brief.profitabilityScore.explanation.replace(/(\d+(?:\.\d+)?)\s*\/\s*(8|10|100)\b/g, (_match, rawScore, rawDenominator) => {
      const score = Number(rawScore);
      const denominator = Number(rawDenominator);
      return formatRatingScore(denominator === 8 ? (score / 8) * 10 : score);
    });
  }

  const readiness = brief.proposalReadinessBreakdown;
  if (readiness) {
    for (const key of ["requirements", "technical", "business", "budget"] as const) {
      const original = readiness[key].score;
      readiness[key].score = normalizeRatingScore(original);
      if (original !== readiness[key].score) {
        warnings.push(`${key} readiness score normalized from ${original} to ${readiness[key].score}/10`);
      }
    }
    const originalOverall = readiness.overallReadiness;
    readiness.overallReadiness = normalizeRatingScore(originalOverall);
    if (originalOverall !== readiness.overallReadiness) {
      warnings.push(`Overall readiness normalized from ${originalOverall} to ${readiness.overallReadiness}/10`);
    }
  }

  return warnings;
}
