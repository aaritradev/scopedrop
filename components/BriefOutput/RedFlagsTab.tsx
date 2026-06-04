import type { GeneratedBrief } from "@/types/brief";
import { formatPercentScore, normalizePercentScore } from "@/lib/scoreUtils";

interface RedFlagsTabProps {
  brief: GeneratedBrief;
  editable?: boolean;
  onChange?: (brief: GeneratedBrief) => void;
}

export function RedFlagsTab({ brief, editable = false, onChange }: RedFlagsTabProps) {
  const confidenceScore = normalizePercentScore(brief.confidenceScore);

  const updateFlags = (value: string) => {
    onChange?.({
      ...brief,
      redFlags: value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="prose-brief space-y-4">
      {editable ? (
        <textarea
          className="input-base min-h-[160px]"
          value={brief.redFlags.join("\n")}
          onChange={(e) => updateFlags(e.target.value)}
          placeholder="One clarification or risk per line"
        />
      ) : brief.redFlags.length === 0 ? (
        <p className="text-sm" style={{ color: "oklch(0.58 0.01 260)" }}>
          No red flags detected. The client communication appears complete.
        </p>
      ) : (
        brief.redFlags.map((flag, i) => (
          <div
            key={i}
            className="card-base flex items-start gap-3 p-4"
            style={{ borderLeft: "3px solid", borderColor: "oklch(0.62 0.14 75)" }}
          >
            <span className="mt-0.5 text-sm">⚠</span>
            <p className="text-sm" style={{ color: "oklch(0.82 0.01 260)" }}>
              {flag}
            </p>
          </div>
        ))
      )}

      <div className="flex items-center gap-2 pt-2">
        <div
          className="h-1.5 flex-1 rounded-full"
          style={{ backgroundColor: "oklch(0.22 0.035 260)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${confidenceScore}%`,
              backgroundColor:
                confidenceScore >= 70
                  ? "oklch(0.45 0.1 145)"
                  : confidenceScore >= 40
                    ? "oklch(0.62 0.14 75)"
                    : "oklch(0.6 0.15 25)",
            }}
          />
        </div>
        <span className="tabular text-xs font-medium" style={{ color: "oklch(0.58 0.01 260)" }}>
          {formatPercentScore(brief.confidenceScore)} confidence
        </span>
      </div>
    </div>
  );
}
