import type { GeneratedBrief } from "@/types/brief";

interface BriefTabProps {
  brief: GeneratedBrief;
  editable?: boolean;
  onChange?: (brief: GeneratedBrief) => void;
}

export function BriefTab({ brief, editable = false, onChange }: BriefTabProps) {
  const updateList = (key: "objectives" | "nextSteps", value: string) => {
    onChange?.({
      ...brief,
      [key]: value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="prose-brief space-y-6">
      <section>
        <h2>Project Summary</h2>
        {editable ? (
          <textarea
            className="input-base min-h-[110px]"
            value={brief.projectSummary}
            onChange={(e) => onChange?.({ ...brief, projectSummary: e.target.value })}
          />
        ) : (
          <p>{brief.projectSummary}</p>
        )}
      </section>

      <section>
        <h2>Objectives</h2>
        {editable ? (
          <textarea
            className="input-base min-h-[120px]"
            value={brief.objectives.join("\n")}
            onChange={(e) => updateList("objectives", e.target.value)}
            placeholder="One objective per line"
          />
        ) : (
          <ul className="space-y-2">
            {brief.objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "oklch(0.82 0.01 260)" }}>
                <span style={{ color: "oklch(0.62 0.14 75)" }}>→</span>
                {obj}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Next Steps</h2>
        {editable ? (
          <textarea
            className="input-base min-h-[120px]"
            value={brief.nextSteps.join("\n")}
            onChange={(e) => updateList("nextSteps", e.target.value)}
            placeholder="One step per line"
          />
        ) : (
          <ul className="space-y-2">
            {brief.nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "oklch(0.82 0.01 260)" }}>
                <span style={{ color: "oklch(0.62 0.14 75)" }}>→</span>
                {step}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
