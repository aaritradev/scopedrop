"use client";

import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Warning } from "@phosphor-icons/react";
import { GeneratorInput } from "@/components/GeneratorInput";
import { OutputView } from "@/components/BriefOutput/OutputView";
import { LoadingState } from "@/components/LoadingState";
import { canUseFeature, getFeatureUpgradeMessage } from "@/lib/billing";
import type { GeneratedBrief } from "@/types/brief";

function GenerateContent() {
  const { isSignedIn, refresh, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const briefId = searchParams.get("id");
  const [brief, setBrief] = useState<GeneratedBrief | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loadedBriefId, setLoadedBriefId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canExportPDF = canUseFeature(user?.plan, "pdfExport");
  const pdfExportUpgradeMessage = getFeatureUpgradeMessage("pdfExport");

  useEffect(() => {
    if (!briefId || !isSignedIn) return;
    setIsLoading(true);
    fetch(`/api/briefs/${briefId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data?.brief?.generated_brief) return;
        setBrief(data.brief.generated_brief as GeneratedBrief);
        setShareToken(data.brief.share_token ?? null);
        setLoadedBriefId(data.brief.id ?? briefId);
      })
      .catch(() => setError("Could not load this brief."))
      .finally(() => setIsLoading(false));
  }, [briefId, isSignedIn]);

  async function handleGenerate(rawInput: string) {
    setIsLoading(true);
    setError(null);
    setBrief(null);
    setLoadedBriefId(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          router.push("/settings/billing");
          return;
        }
        setError(data.error || "Failed to generate brief. Please try again.");
        return;
      }

      setBrief(data.brief);
      setShareToken(data.shareToken ?? null);
      setLoadedBriefId(data.briefId ?? null);
      refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExportPDF() {
    if (!brief || !loadedBriefId) return;
    if (!canExportPDF) {
      setError(pdfExportUpgradeMessage);
      return;
    }

    const res = await fetch(`/api/briefs/${loadedBriefId}/export-pdf`);
    if (!res.ok) {
      setError(res.status === 403 ? pdfExportUpgradeMessage : "Could not export PDF. Please try again.");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${brief.projectTitle.replace(/\s+/g, "_")}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleSave(updatedBrief: GeneratedBrief) {
    if (!loadedBriefId) {
      setBrief(updatedBrief);
      return;
    }

    const res = await fetch(`/api/briefs/${loadedBriefId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: updatedBrief.projectTitle,
        client_name: updatedBrief.clientName,
        generated_brief: updatedBrief,
      }),
    });

    if (!res.ok) {
      setError("Could not save changes. Please try again.");
      return;
    }

    setBrief(updatedBrief);
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 18 }}
      >
        <h1 className="text-display-md font-bold text-on-surface">
          Generate Brief
        </h1>
        <p className="mt-1 text-sm text-on-surface/55">
          Paste messy client communication and get a complete onboarding brief in seconds.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!brief && !isLoading && (
          <motion.div
            key="input"
            className="card-base p-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 100, damping: 18 }}
          >
            <GeneratorInput onGenerate={handleGenerate} isLoading={isLoading} />
          </motion.div>
        )}

        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 100, damping: 18 }}
          >
            <LoadingState />
          </motion.div>
        )}

        {error && (
          <motion.div
            key="error"
            className="card-base flex items-start gap-3 whitespace-pre-line border p-4 text-sm"
            style={{ borderColor: "oklch(0.6 0.15 25)", color: "oklch(0.75 0.08 25)" }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 100, damping: 18 }}
          >
            <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
            {error}
          </motion.div>
        )}

        {brief && !isLoading && (
          <motion.div
            key="output"
            className="space-y-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 100, damping: 18 }}
          >
            <OutputView
              briefId={loadedBriefId}
              brief={brief}
              editable={isSignedIn}
              onChange={setBrief}
              onSave={handleSave}
              onExportPDF={handleExportPDF}
              onPDFUpgrade={() => router.push("/settings/billing")}
              canExportPDF={canExportPDF}
              pdfExportUpgradeMessage={pdfExportUpgradeMessage}
              shareToken={shareToken}
            />
            <div className="flex justify-center">
              <motion.button
                onClick={() => { setBrief(null); setShareToken(null); setError(null); }}
                className="btn-ghost text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <ArrowLeft size={14} weight="bold" />
                Generate Another
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={null}>
      <GenerateContent />
    </Suspense>
  );
}
