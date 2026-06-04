import type { EntityEntry, EntitySource, SourceAttribution } from "@/types/brief";

export class EntityRegistry {
  private entities: Map<string, EntityEntry> = new Map();

  add(id: string, value: string, category: string, source: EntitySource, confidence: number, evidence?: string): void {
    const key = `${category}:${id}`;
    const entry: EntityEntry = {
      id,
      value,
      category,
      attribution: { source, confidence: Math.min(1, Math.max(0, confidence)), evidence },
    };
    this.entities.set(key, entry);
  }

  get(category: string, id: string): EntityEntry | undefined {
    return this.entities.get(`${category}:${id}`);
  }

  getAll(): EntityEntry[] {
    return Array.from(this.entities.values());
  }

  getByCategory(category: string): EntityEntry[] {
    return this.getAll().filter(e => e.category === category);
  }

  getBySource(source: EntitySource): EntityEntry[] {
    return this.getAll().filter(e => e.attribution.source === source);
  }

  getUnsupported(threshold = 0.4): EntityEntry[] {
    return this.getAll().filter(e => e.attribution.confidence < threshold);
  }

  getSummary(): { total: number; fromInput: number; inferred: number; generated: number; fallback: number } {
    const all = this.getAll();
    return {
      total: all.length,
      fromInput: all.filter(e => e.attribution.source === "client_input").length,
      inferred: all.filter(e => e.attribution.source === "inferred").length,
      generated: all.filter(e => e.attribution.source === "generated").length,
      fallback: all.filter(e => e.attribution.source === "fallback").length,
    };
  }

  hasCategoryWithSource(category: string, source: EntitySource): boolean {
    return this.getAll().some(e => e.category === category && e.attribution.source === source);
  }

  clear(): void {
    this.entities.clear();
  }
}

export function computeDomainConfidence(registry: EntityRegistry): number {
  const features = registry.getByCategory("feature");
  if (features.length === 0) return 0.1;

  const inputFeatures = features.filter(f => f.attribution.source === "client_input").length;
  const totalFeatures = features.length;
  const featureConfidence = totalFeatures > 0 ? inputFeatures / totalFeatures : 0;

  const budget = registry.get("budget", "budget");
  const timeline = registry.get("timeline", "timeline");
  const countries = registry.getByCategory("country");

  const hasBudget = budget && budget.attribution.source === "client_input" ? 0.2 : 0;
  const hasTimeline = timeline && timeline.attribution.source === "client_input" ? 0.15 : 0;
  const hasCountries = countries.length > 0 ? 0.1 : 0;

  return Math.min(1, featureConfidence * 0.55 + hasBudget + hasTimeline + hasCountries);
}

export function computeConsistencyScore(registry: EntityRegistry): number {
  const all = registry.getAll();
  if (all.length === 0) return 0;

  const clientInput = all.filter(e => e.attribution.source === "client_input").length;
  const generated = all.filter(e => e.attribution.source === "generated" || e.attribution.source === "fallback").length;
  const unsupported = registry.getUnsupported().length;

  const inputRatio = clientInput / all.length;
  const unsupportedPenalty = unsupported / all.length;

  return Math.round(Math.max(0, Math.min(100, (inputRatio * 0.7 + (1 - unsupportedPenalty) * 0.3) * 100)));
}
