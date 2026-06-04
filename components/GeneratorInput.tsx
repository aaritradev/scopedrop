"use client";

import { useEffect, useState } from "react";

interface GeneratorInputProps {
  onGenerate: (text: string) => void;
  isLoading: boolean;
  initialText?: string;
}

export function GeneratorInput({ onGenerate, isLoading, initialText = "" }: GeneratorInputProps) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (!initialText) return;
    setText((current) => current || initialText);
  }, [initialText]);

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste client email, WhatsApp chat, Slack thread, or meeting notes to generate a professional brief."
        className="input-base min-h-[200px] resize-y"
        rows={8}
        disabled={isLoading}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "oklch(0.58 0.01 260)" }}>
          Tip: Paste the full conversation. ScopeDrop extracts goals, scope, deliverables, timeline, payment terms, and red flags.
        </p>
        <button
          onClick={() => onGenerate(text)}
          disabled={text.length < 20 || isLoading}
          className="btn-primary"
        >
          {isLoading ? "Generating..." : "Generate Brief"}
        </button>
      </div>
    </div>
  );
}
