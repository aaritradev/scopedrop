"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  PencilSimple,
  Copy,
  Check,
  PaperPlaneTilt,
  Signature,
  TrashSimple,
  ArrowLeft,
  FilePdf,
  DotsThree,
} from "@phosphor-icons/react";
import { OutputView } from "@/components/BriefOutput/OutputView";
import { CreatePortalModal } from "@/components/CreatePortalModal";
import { useAuth } from "@/contexts/AuthContext";
import { canUseFeature, getFeatureUpgradeMessage } from "@/lib/billing";
import type { GeneratedBrief } from "@/types/brief";

interface BriefData {
  id: string;
  title: string;
  client_name: string;
  raw_input: string;
  generated_brief: GeneratedBrief;
  status: "draft" | "sent" | "signed";
  share_token: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  draft: "rgba(255,255,255,0.4)",
  sent: "#34d399",
  signed: "#6ee7b7",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  signed: "Signed",
};

export default function BriefDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPortalModal, setShowPortalModal] = useState(false);
  const canExportPDF = canUseFeature(user?.plan, "pdfExport");
  const canCreatePortal = canUseFeature(user?.plan, "clientPortal");
  const pdfExportUpgradeMessage = getFeatureUpgradeMessage("pdfExport");

  const fetchBrief = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/briefs/${id}`);
      if (!res.ok) {
        router.push("/dashboard");
        return;
      }
      const data = await res.json();
      setBrief(data.brief);
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  const handleCopyShareLink = () => {
    if (!brief?.share_token) return;
    const url = `${window.location.origin}/brief/${brief.share_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!brief) return;
    const res = await fetch(`/api/briefs/${brief.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setBrief({ ...brief, status: newStatus as BriefData["status"] });
    }
  };

  const handleDelete = async () => {
    if (!brief || !confirm("Delete this brief permanently?")) return;
    setDeleting(true);
    const res = await fetch(`/api/briefs/${brief.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      setDeleting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!brief) return;
    if (!canExportPDF) {
      router.push("/settings/billing");
      return;
    }

    const res = await fetch(`/api/briefs/${brief.id}/export-pdf`);
    if (!res.ok) {
      if (res.status === 403) router.push("/settings/billing");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${brief.title || "brief"}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="h-7 w-48 rounded shimmer" />
        <div className="mt-8 h-96 rounded-xl shimmer" />
      </div>
    );
  }

  if (!brief) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-on-surface/50 hover:text-on-surface transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: statusColors[brief.status] }}
              />
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: statusColors[brief.status] }}
              >
                {statusLabels[brief.status]}
              </span>
              <span className="text-[11px] text-on-surface/40">
                {new Date(brief.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <h1 className="text-display-md font-bold text-on-surface">
              {brief.title}
            </h1>
            <p className="mt-1 text-sm text-on-surface/55">
              {brief.client_name}
            </p>
          </div>

          {/* Actions dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-colors"
            >
              <DotsThree size={18} weight="bold" className="text-on-surface/60" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-white/10 bg-[#1a1b1e] p-1.5 shadow-xl">
                  <button
                    onClick={() => { router.push(`/briefs/${brief.id}/edit`); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-on-surface/80 hover:bg-white/[0.06] transition-colors"
                  >
                    <PencilSimple size={15} />
                    Edit brief
                  </button>
                  <button
                    onClick={() => { handleCopyShareLink(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-on-surface/80 hover:bg-white/[0.06] transition-colors"
                  >
                    {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                    {copied ? "Copied!" : "Copy share link"}
                  </button>
                  {brief.status === "draft" && (
                    <button
                      onClick={() => { handleStatusChange("sent"); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-emerald-400/80 hover:bg-white/[0.06] transition-colors"
                    >
                      <PaperPlaneTilt size={15} />
                      Mark as sent
                    </button>
                  )}
                  {brief.status === "sent" && (
                    <button
                      onClick={() => { handleStatusChange("signed"); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-emerald-400/80 hover:bg-white/[0.06] transition-colors"
                    >
                      <Signature size={15} />
                      Mark as signed
                    </button>
                  )}
                  <div className="my-1 border-t border-white/10" />
                  <button
                    onClick={() => { handleExportPDF(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-on-surface/80 hover:bg-white/[0.06] transition-colors"
                  >
                    <FilePdf size={15} />
                    {canExportPDF ? "Export PDF" : "Upgrade for PDF"}
                  </button>
                  <button
                    onClick={() => { handleDelete(); setMenuOpen(false); }}
                    disabled={deleting}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400/80 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                  >
                    <TrashSimple size={15} />
                    {deleting ? "Deleting..." : "Delete brief"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Brief output */}
      <OutputView
        briefId={brief.id}
        brief={brief.generated_brief}
        shareToken={brief.share_token}
        onExportPDF={handleExportPDF}
        onPDFUpgrade={() => router.push("/settings/billing")}
        canExportPDF={canExportPDF}
        pdfExportUpgradeMessage={pdfExportUpgradeMessage}
        canCreatePortal={canCreatePortal}
        onCreatePortal={() => setShowPortalModal(true)}
        onPortalUpgrade={() => router.push("/settings/billing")}
      />

      <CreatePortalModal
        isOpen={showPortalModal}
        onClose={() => setShowPortalModal(false)}
        scopeId={brief.id}
        defaultClientName={brief.client_name}
      />
    </div>
  );
}
