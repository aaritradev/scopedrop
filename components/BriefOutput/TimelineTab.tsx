import type { GeneratedBrief } from "@/types/brief";

interface TimelineTabProps {
  brief: GeneratedBrief;
  editable?: boolean;
  onChange?: (brief: GeneratedBrief) => void;
}

export function TimelineTab({ brief, editable = false, onChange }: TimelineTabProps) {
  const updateMilestone = (index: number, key: "milestone" | "description" | "estimatedDays", value: string) => {
    const nextTimeline = [...brief.timeline];

    if (key === "estimatedDays") {
      const parsed = Number.parseInt(value, 10);
      nextTimeline[index] = {
        ...nextTimeline[index],
        estimatedDays: Number.isNaN(parsed) ? 0 : Math.max(parsed, 0),
      };
    } else {
      nextTimeline[index] = {
        ...nextTimeline[index],
        [key]: value,
      };
    }

    onChange?.({ ...brief, timeline: nextTimeline });
  };

  return (
    <div className="prose-brief space-y-4">
      {brief.timeline.map((milestone, i) => (
        <div key={i} className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: "oklch(0.62 0.14 75)", color: "oklch(1 0 0)" }}
            >
              {i + 1}
            </div>
            {i < brief.timeline.length - 1 && (
              <div className="mt-1 w-px flex-1" style={{ backgroundColor: "oklch(0.22 0.035 260)" }} />
            )}
          </div>
          <div className="flex-1 pb-6">
            <div className="flex items-center justify-between">
              {editable ? (
                <input
                  className="input-base h-9 py-1 text-sm font-semibold"
                  value={milestone.milestone}
                  onChange={(e) => updateMilestone(i, "milestone", e.target.value)}
                />
              ) : (
                <h3 className="text-sm font-semibold" style={{ color: "oklch(0.93 0.005 260)" }}>
                  {milestone.milestone}
                </h3>
              )}
              {editable ? (
                <div className="ml-3 flex items-center gap-2">
                  <input
                    className="input-base h-9 w-20 py-1 text-xs tabular"
                    type="number"
                    min={0}
                    value={milestone.estimatedDays}
                    onChange={(e) => updateMilestone(i, "estimatedDays", e.target.value)}
                  />
                  <span className="text-xs" style={{ color: "oklch(0.58 0.01 260)" }}>days</span>
                </div>
              ) : (
                <span className="tabular text-xs font-medium" style={{ color: "oklch(0.62 0.14 75)" }}>
                  {milestone.estimatedDays} days
                </span>
              )}
            </div>
            {editable ? (
              <textarea
                className="input-base mt-2 min-h-[90px]"
                value={milestone.description}
                onChange={(e) => updateMilestone(i, "description", e.target.value)}
              />
            ) : (
              <p className="mt-1 text-sm" style={{ color: "oklch(0.58 0.01 260)" }}>
                {milestone.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
