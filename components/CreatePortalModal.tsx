"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Check, Copy, User, EnvelopeSimple, Globe } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

interface CreatePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
  defaultClientName?: string;
  onSuccess?: () => void;
}

export function CreatePortalModal({ isOpen, onClose, scopeId, defaultClientName = "", onSuccess }: CreatePortalModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "success">("form");
  const [clientName, setClientName] = useState(defaultClientName);
  const [clientEmail, setClientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [portalData, setPortalData] = useState<{ id: string; slug: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setError("Client name is required");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail,
          scope_id: scopeId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create portal");
      }

      setPortalData({ id: data.project.id, slug: data.project.portal_slug });
      setStep("success");
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!portalData) return;
    const url = `${window.location.origin}/p/${portalData.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#1a1b1e] border border-white/10 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h3 className="text-base font-semibold text-on-surface">
              {step === "form" ? "Create Client Portal" : "Portal Created!"}
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-on-surface/50 hover:bg-white/[0.06] hover:text-on-surface transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6">
            {step === "form" ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400 border border-red-500/20">
                    {error}
                  </div>
                )}
                
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-on-surface/55">
                    Client Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/30" />
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="input-base pl-9 h-11"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-on-surface/55">
                    Client Email (Optional)
                  </label>
                  <div className="relative">
                    <EnvelopeSimple size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/30" />
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@company.com"
                      className="input-base pl-9 h-11"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading || !clientName.trim()}
                    className="btn-primary w-full h-11 justify-center disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Create Portal"}
                    {!loading && <ArrowRight size={16} weight="bold" />}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                    <Check size={24} weight="bold" />
                  </div>
                  <h4 className="text-lg font-semibold text-on-surface mb-1">
                    Ready to share
                  </h4>
                  <p className="text-sm text-on-surface/55">
                    Your client's private portal is live. Share this secure link with them.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-on-surface/55">
                    Portal Link
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/30" />
                      <input
                        type="text"
                        readOnly
                        value={portalData ? `scopedrop.me/p/${portalData.slug}` : ""}
                        className="input-base pl-9 pr-3 h-11 bg-white/[0.04] opacity-80"
                      />
                    </div>
                    <button
                      onClick={handleCopy}
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-on-surface border border-white/10 transition-colors shrink-0"
                      title="Copy link"
                    >
                      {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      router.push(`/dashboard/project/${portalData?.id}`);
                    }}
                    className="btn-secondary w-full h-11 justify-center"
                  >
                    View Project Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
