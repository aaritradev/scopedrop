"use client";

import { useState } from "react";
import type { GeneratedBrief } from "@/types/brief";
import { BriefTab } from "./BriefTab";
import { ScopeTab } from "./ScopeTab";
import { TimelineTab } from "./TimelineTab";
import { PaymentTab } from "./PaymentTab";
import { RedFlagsTab } from "./RedFlagsTab";
import { AnalysisTab } from "./AnalysisTab";
import { formatPercentScore } from "@/lib/scoreUtils";

const tabs = [
  { id: "brief", label: "Brief" },
  { id: "scope", label: "Scope" },
  { id: "timeline", label: "Timeline" },
  { id: "payment", label: "Payment" },
  { id: "flags", label: "Red Flags" },
  { id: "analysis", label: "Analysis" },
] as const;

type TabId = (typeof tabs)[number]["id"];

interface OutputViewProps {
  briefId?: string | null;
  brief: GeneratedBrief;
  editable?: boolean;
  onChange?: (brief: GeneratedBrief) => void;
  onSave?: (brief: GeneratedBrief) => Promise<void> | void;
  onExportPDF?: () => void;
  onPDFUpgrade?: () => void;
  canExportPDF?: boolean;
  pdfExportUpgradeMessage?: string;
  shareToken?: string | null;
  onCreatePortal?: () => void;
  onPortalUpgrade?: () => void;
  canCreatePortal?: boolean;
  isClientView?: boolean;
}

export function OutputView({
  briefId,
  brief,
  editable = false,
  onChange,
  onSave,
  onExportPDF,
  onPDFUpgrade,
  canExportPDF = true,
  pdfExportUpgradeMessage,
  shareToken,
  onCreatePortal,
  onPortalUpgrade,
  canCreatePortal = false,
  isClientView = false,
}: OutputViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("brief");

  const visibleTabs = tabs.filter((tab) => {
    if (isClientView && (tab.id === "flags" || tab.id === "analysis")) {
      return false;
    }
    return true;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendMessage, setSendMessage] = useState<string | null>(null);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(brief);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!briefId || !recipientEmail) return;
    setIsSending(true);
    setSendMessage(null);

    try {
      const res = await fetch("/api/send-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefId, toEmail: recipientEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSendMessage(data.error || "Could not send email.");
        return;
      }

      setSendMessage("Brief sent successfully.");
      setRecipientEmail("");
    } catch {
      setSendMessage("Could not send email.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="card-base animate-fade-in">
      <div className="border-b px-6 py-4" style={{ borderColor: "oklch(0.22 0.035 260)" }}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold" style={{ color: "oklch(0.93 0.005 260)" }}>
              {brief.projectTitle}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: "oklch(0.58 0.01 260)" }}>
              Client: {brief.clientName}
            </p>
          </div>
          <div
            className="rounded-full px-3 py-1 text-[10px] font-bold tracking-wider"
            style={{
              backgroundColor: "oklch(0.62 0.14 75 / 0.15)",
              color: "oklch(0.62 0.14 75)",
            }}
          >
            {formatPercentScore(brief.confidenceScore)} complete
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      {brief.executiveSummary && (
        <div className="border-b px-6 py-5" style={{ borderColor: "oklch(0.22 0.035 260)", backgroundColor: "oklch(0.62 0.14 75 / 0.04)" }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "oklch(0.62 0.14 75)" }}>
            Executive Summary
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "oklch(0.82 0.01 260)" }}>
            {brief.executiveSummary}
          </p>
        </div>
      )}

      <div className="border-b" style={{ borderColor: "oklch(0.22 0.035 260)" }}>
        <div className="flex gap-0 px-6 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-3 text-sm font-medium transition-colors duration-150 relative whitespace-nowrap"
              style={{
                color: activeTab === tab.id ? "oklch(0.93 0.005 260)" : "oklch(0.58 0.01 260)",
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: "oklch(0.62 0.14 75)" }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeTab === "brief" && <BriefTab brief={brief} editable={editable} onChange={onChange} />}
        {activeTab === "scope" && <ScopeTab brief={brief} editable={editable} onChange={onChange} />}
        {activeTab === "timeline" && <TimelineTab brief={brief} editable={editable} onChange={onChange} />}
        {activeTab === "payment" && <PaymentTab brief={brief} editable={editable} onChange={onChange} />}
        {!isClientView && activeTab === "flags" && <RedFlagsTab brief={brief} editable={editable} onChange={onChange} />}
        {!isClientView && activeTab === "analysis" && <AnalysisTab brief={brief} />}
      </div>

      <div className="flex items-center gap-3 border-t px-6 py-4" style={{ borderColor: "oklch(0.22 0.035 260)" }}>
        {editable && onSave && (
          <button onClick={handleSave} disabled={isSaving} className="btn-primary text-xs disabled:opacity-50">
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        )}
        {onExportPDF && (
          <button
            onClick={canExportPDF ? onExportPDF : onPDFUpgrade}
            className="btn-secondary text-xs"
          >
            {canExportPDF ? "Export PDF" : "Upgrade for PDF"}
          </button>
        )}
        {shareToken && (
          <button
            onClick={() => {
              const url = `${window.location.origin}/brief/${shareToken}`;
              navigator.clipboard.writeText(url);
            }}
            className="btn-ghost text-xs"
          >
            Copy Share Link
          </button>
        )}
      </div>

      {(onCreatePortal || onPortalUpgrade) && (
        <div className="border-t px-6 py-4 flex items-center justify-between" style={{ borderColor: "oklch(0.22 0.035 260)", backgroundColor: "oklch(0.62 0.14 75 / 0.04)" }}>
          <div>
            <p className="text-sm font-bold" style={{ color: "oklch(0.93 0.005 260)" }}>
              Client Portal
            </p>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.58 0.01 260)" }}>
              Share this scope, collect files, and get paid via a single link.
            </p>
          </div>
          <button
            onClick={canCreatePortal ? onCreatePortal : onPortalUpgrade}
            className="btn-primary text-xs shrink-0"
          >
            {canCreatePortal ? "Create Client Portal" : "Upgrade to Share with Client"}
          </button>
        </div>
      )}

      {onExportPDF && !canExportPDF && pdfExportUpgradeMessage && (
        <p className="border-t px-6 py-3 text-xs text-on-surface/55" style={{ borderColor: "oklch(0.22 0.035 260)" }}>
          {pdfExportUpgradeMessage}
        </p>
      )}

      {editable && briefId && (
        <div className="border-t px-6 py-4" style={{ borderColor: "oklch(0.22 0.035 260)" }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.58 0.01 260)" }}>
            Send to Client
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="input-base h-10 py-1"
              placeholder="client@example.com"
            />
            <button
              onClick={handleSend}
              disabled={isSending || !recipientEmail}
              className="btn-secondary h-10 text-xs disabled:opacity-50"
            >
              {isSending ? "Sending..." : "Send Brief"}
            </button>
          </div>
          {sendMessage && (
            <p className="mt-3 text-xs" style={{ color: "oklch(0.58 0.01 260)" }}>
              {sendMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
