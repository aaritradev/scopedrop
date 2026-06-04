"use client";

import { useState, useEffect } from "react";

const messages = [
  "Reading client intent...",
  "Building scope of work...",
  "Estimating timeline...",
  "Structuring payment terms...",
];

export function LoadingState() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => Math.min(s + 1, messages.length - 1));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
        <div className="card-base animate-fade-in overflow-hidden">
          {/* Header skeleton */}
          <div className="border-b border-white/10 px-6 py-4">
            <div className="h-5 w-48 rounded-sm shimmer" />
            <div className="mt-2 h-3 w-24 rounded-sm shimmer" />
          </div>

          {/* Tabs skeleton */}
          <div className="border-b border-white/10 px-6 py-3">
            <div className="flex gap-6">
            {["Brief", "Scope", "Timeline", "Payment", "Flags"].map((tab, i) => (
              <div
                key={tab}
                className="h-3 rounded-sm shimmer"
                style={{ width: `${tab.length * 7}px`, animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
        </div>

        {/* Content skeleton */}
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <div className="h-3 w-16 rounded-sm shimmer" style={{ animationDelay: "0.1s" }} />
            <div className="h-3 w-full rounded-sm shimmer" style={{ animationDelay: "0.15s" }} />
            <div className="h-3 w-3/4 rounded-sm shimmer" style={{ animationDelay: "0.2s" }} />
            <div className="h-3 w-5/6 rounded-sm shimmer" style={{ animationDelay: "0.25s" }} />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-20 rounded-sm shimmer" style={{ animationDelay: "0.3s" }} />
            <div className="h-3 w-full rounded-sm shimmer" style={{ animationDelay: "0.35s" }} />
            <div className="h-3 w-2/3 rounded-sm shimmer" style={{ animationDelay: "0.4s" }} />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-24 rounded-sm shimmer" style={{ animationDelay: "0.45s" }} />
            <div className="h-3 w-full rounded-sm shimmer" style={{ animationDelay: "0.5s" }} />
            <div className="h-3 w-4/5 rounded-sm shimmer" style={{ animationDelay: "0.55s" }} />
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
                className="block h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i <= step ? "12px" : "6px",
                  backgroundColor: i <= step ? "oklch(0.62 0.14 75)" : "rgba(255,255,255,0.12)",
                }}
              />
            ))}
          </div>
          <p
            className="text-xs font-medium transition-all duration-300"
            style={{ color: "rgba(227,226,229,0.6)" }}
          >
            {messages[step]}
          </p>
      </div>
    </div>
  );
}
