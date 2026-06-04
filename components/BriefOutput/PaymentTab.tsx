import type { GeneratedBrief } from "@/types/brief";

interface PaymentTabProps {
  brief: GeneratedBrief;
  editable?: boolean;
  onChange?: (brief: GeneratedBrief) => void;
}

export function PaymentTab({ brief, editable = false, onChange }: PaymentTabProps) {
  const { paymentTerms } = brief;

  const updatePayment = (key: "estimatedBudget" | "deposit" | "finalPayment", value: string) => {
    onChange?.({
      ...brief,
      paymentTerms: {
        ...paymentTerms,
        [key]: value,
      },
    });
  };

  const updateMilestones = (value: string) => {
    onChange?.({
      ...brief,
      paymentTerms: {
        ...paymentTerms,
        milestonePayments: value
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      },
    });
  };

  return (
    <div className="prose-brief space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card-base p-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.58 0.01 260)" }}>
            Estimated Budget
          </p>
          {editable ? (
            <input
              className="input-base h-10 py-1"
              value={paymentTerms.estimatedBudget}
              onChange={(e) => updatePayment("estimatedBudget", e.target.value)}
            />
          ) : (
            <p className="text-lg font-bold" style={{ color: "oklch(0.93 0.005 260)" }}>
              {paymentTerms.estimatedBudget}
            </p>
          )}
        </div>
        <div className="card-base p-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.58 0.01 260)" }}>
            Deposit
          </p>
          {editable ? (
            <input
              className="input-base h-10 py-1"
              value={paymentTerms.deposit}
              onChange={(e) => updatePayment("deposit", e.target.value)}
            />
          ) : (
            <p className="text-lg font-bold" style={{ color: "oklch(0.93 0.005 260)" }}>
              {paymentTerms.deposit}
            </p>
          )}
        </div>
      </div>

      <section>
        <h2>Milestone Payments</h2>
        {editable ? (
          <textarea
            className="input-base min-h-[120px]"
            value={paymentTerms.milestonePayments.join("\n")}
            onChange={(e) => updateMilestones(e.target.value)}
            placeholder="One milestone payment per line"
          />
        ) : (
          <ul className="space-y-2">
            {paymentTerms.milestonePayments.map((mp, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "oklch(0.82 0.01 260)" }}>
                <span style={{ color: "oklch(0.62 0.14 75)" }}>→</span>
                {mp}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Final Payment</h2>
        {editable ? (
          <input
            className="input-base h-10 py-1"
            value={paymentTerms.finalPayment}
            onChange={(e) => updatePayment("finalPayment", e.target.value)}
          />
        ) : (
          <p className="text-sm font-medium" style={{ color: "oklch(0.82 0.01 260)" }}>
            {paymentTerms.finalPayment}
          </p>
        )}
      </section>
    </div>
  );
}
