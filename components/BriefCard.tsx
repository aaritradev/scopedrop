"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  PaperPlaneTilt,
  Signature,
  DotsThree,
  TrashSimple,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

interface BriefCardProps {
  id: string;
  title: string;
  clientName: string;
  status: "draft" | "sent" | "signed";
  createdAt: string;
  onDeleted?: (id: string) => void;
  onStatusChanged?: (id: string, status: string) => void;
}

const statusConfig = {
  draft: {
    label: "Draft",
    icon: null,
    dot: "bg-white/40",
    border: "border-l-white/20",
  },
  sent: {
    label: "Sent",
    icon: PaperPlaneTilt,
    dot: "bg-emerald-400",
    border: "border-l-emerald-400/30",
  },
  signed: {
    label: "Signed",
    icon: Signature,
    dot: "bg-emerald-300",
    border: "border-l-emerald-300/40",
  },
};

export function BriefCard({ id, title, clientName, status, createdAt, onDeleted, onStatusChanged }: BriefCardProps) {
  const router = useRouter();
  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;
  const date = new Date(createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    const res = await fetch(`/api/briefs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      onStatusChanged?.(id, newStatus);
    }
    setMenuOpen(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/briefs/${id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted?.(id);
    } else {
      setDeleting(false);
    }
    setMenuOpen(false);
  };

  return (
    <div className={`group relative rounded-xl border border-white/10 bg-white/[0.02] pl-4 pr-5 py-4 transition-all duration-200 hover:bg-white/[0.05] hover:border-white/15 hover:shadow-[0_0_0_1px_rgba(255,149,0,0.15)] ${cfg.border} border-l-2`}>
      <Link
        href={`/briefs/${id}`}
        className="block"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold truncate text-on-surface group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm mt-0.5 text-on-surface/55">
              {clientName}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
              {StatusIcon && <StatusIcon size={10} weight="fill" className={status === "sent" ? "text-emerald-400" : "text-emerald-300"} />}
              <span className={`text-[11px] font-medium ${status === "draft" ? "text-white/50" : "text-emerald-300"}`}>
                {cfg.label}
              </span>
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-on-surface/40">{date}</span>
          <ArrowRight size={12} weight="bold" className="text-on-surface/20 group-hover:text-primary/60 transition-colors -translate-x-1 group-hover:translate-x-0 transition-transform duration-200" />
        </div>
      </Link>

      {/* Actions menu */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/[0.08] transition-colors"
        >
          <DotsThree size={15} weight="bold" className="text-on-surface/40" />
        </button>
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-2 top-10 z-20 w-40 rounded-xl border border-white/10 bg-[#1a1b1e] p-1.5 shadow-xl">
            {status === "draft" && (
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange("sent"); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-400/80 hover:bg-white/[0.06] transition-colors"
              >
                <PaperPlaneTilt size={13} />
                Mark sent
              </button>
            )}
            {status === "sent" && (
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange("signed"); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-400/80 hover:bg-white/[0.06] transition-colors"
              >
                <Signature size={13} />
                Mark signed
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); if (!deleting) handleDelete(); }}
              disabled={deleting}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400/70 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
            >
              <TrashSimple size={13} />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
