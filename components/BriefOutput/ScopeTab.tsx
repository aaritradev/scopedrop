import type { GeneratedBrief } from "@/types/brief";

interface ScopeTabProps {
  brief: GeneratedBrief;
  editable?: boolean;
  onChange?: (brief: GeneratedBrief) => void;
}

export function ScopeTab({ brief, editable = false, onChange }: ScopeTabProps) {
  const updateList = (key: "scopeIncluded" | "scopeExcluded" | "assumptions", value: string) => {
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
      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h2>Included</h2>
          {editable ? (
            <textarea
              className="input-base min-h-[150px]"
              value={brief.scopeIncluded.join("\n")}
              onChange={(e) => updateList("scopeIncluded", e.target.value)}
              placeholder="One inclusion per line"
            />
          ) : (
            <ul className="space-y-2">
              {brief.scopeIncluded.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "oklch(0.82 0.01 260)" }}>
                  <span style={{ color: "oklch(0.45 0.1 145)" }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2>Not Included</h2>
          {editable ? (
            <textarea
              className="input-base min-h-[150px]"
              value={brief.scopeExcluded.join("\n")}
              onChange={(e) => updateList("scopeExcluded", e.target.value)}
              placeholder="One exclusion per line"
            />
          ) : (
            <ul className="space-y-2">
              {brief.scopeExcluded.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "oklch(0.58 0.01 260)" }}>
                  <span className="opacity-50">-</span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <h2>Assumptions</h2>
        {editable ? (
          <textarea
            className="input-base min-h-[130px]"
            value={brief.assumptions.join("\n")}
            onChange={(e) => updateList("assumptions", e.target.value)}
            placeholder="One assumption per line"
          />
        ) : (
          <ul className="space-y-2">
            {brief.assumptions.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "oklch(0.58 0.01 260)" }}>
                <span className="opacity-60">⚠</span>
                {item}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
