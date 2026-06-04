"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Files, Plus, PaperPlaneTilt, Signature, Lightning, Sparkle, MagnifyingGlass, ArrowDown, ArrowUp } from "@phosphor-icons/react";
import { BriefCard } from "@/components/BriefCard";
import { FREE_MONTHLY_CREDITS, getFeatureUpgradeMessage } from "@/lib/billing";

interface Brief {
  id: string;
  title: string;
  client_name: string;
  status: "draft" | "sent" | "signed";
  created_at: string;
  share_token: string;
}

interface MeData {
  plan?: string;
  credits_remaining?: number;
}

interface BriefHistoryMeta {
  fullAccess: boolean;
  limit: number | null;
  total: number;
}

const statCards = [
  { key: "total", label: "Total Briefs", icon: Files, color: "text-primary", bg: "bg-primary/10" },
  { key: "sent", label: "Sent", icon: PaperPlaneTilt, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { key: "signed", label: "Signed", icon: Signature, color: "text-emerald-300", bg: "bg-emerald-300/10" },
] as const;

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <div className="h-7 w-48 rounded shimmer" />
        <div className="mt-2 h-4 w-36 rounded shimmer" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <div className="h-3 w-16 rounded shimmer" />
            <div className="h-7 w-12 rounded shimmer" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <div className="h-4 w-3/4 rounded shimmer" />
            <div className="h-3 w-1/2 rounded shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

type StatusFilter = "all" | "draft" | "sent" | "signed";
type SortOrder = "newest" | "oldest";

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useAuth();
  const router = useRouter();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [me, setMe] = useState<MeData | null>(null);
  const [history, setHistory] = useState<BriefHistoryMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  useEffect(() => {
    if (!isSignedIn && isLoaded) {
      router.push("/sign-in");
      return;
    }
    if (!isSignedIn) return;

    Promise.all([
      fetch("/api/briefs").then((r) => r.json()),
      fetch("/api/me").then((r) => r.json()).catch(() => ({ user: null })),
    ])
      .then(([briefsData, meData]) => {
        setBriefs(briefsData.briefs ?? []);
        setHistory(briefsData.history ?? null);
        setMe(meData.user ?? null);
      })
      .finally(() => setLoading(false));
  }, [isSignedIn, isLoaded, router]);

  const filtered = useMemo(() => {
    let result = [...briefs];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.client_name.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }

    result.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });

    return result;
  }, [briefs, search, statusFilter, sortOrder]);

  const stats = {
    total: briefs.length,
    sent: briefs.filter((b) => b.status === "sent").length,
    signed: briefs.filter((b) => b.status === "signed").length,
  };

  if (!isLoaded || loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-display-md font-bold text-on-surface">
              {user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
            </h1>
            <p className="mt-1 text-sm text-on-surface/55">
              {briefs.length > 0
                ? `You have ${briefs.length} brief${briefs.length !== 1 ? "s" : ""} — ${stats.sent} sent, ${stats.signed} signed`
                : "Create your first brief to get started"}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5">
            <Sparkle size={14} weight="fill" className="text-primary" />
            <span className="text-xs text-on-surface/55">
              {me?.plan === "pro" ? "Unlimited briefs" : `${me?.credits_remaining ?? FREE_MONTHLY_CREDITS} credits left`}
            </span>
          </div>
        </div>

        {history && !history.fullAccess && history.total > (history.limit ?? 0) && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-on-surface/75">
            Showing latest {history.limit ?? FREE_MONTHLY_CREDITS} of {history.total} briefs. {getFeatureUpgradeMessage("fullBriefHistory")}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 100, damping: 18 }}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-on-surface/50 uppercase tracking-wider">
                  {stat.label}
                </span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                  <stat.icon size={15} weight="duotone" className={stat.color} />
                </div>
              </div>
              <p className="tabular text-2xl font-bold text-on-surface">
                {stats[stat.key]}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or client..."
              className="input-base h-9 pl-9 pr-3 text-sm"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-1">
            {(["all", "draft", "sent", "signed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  color: statusFilter === s ? "#e3e2e5" : "rgba(227,226,229,0.45)",
                  backgroundColor: statusFilter === s ? "rgba(255,149,0,0.12)" : "transparent",
                }}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Sort */}
          <button
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-on-surface/55 hover:text-on-surface transition-colors"
          >
            {sortOrder === "newest" ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
            {sortOrder === "newest" ? "Newest" : "Oldest"}
          </button>
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wider">
            {filtered.length === briefs.length
              ? "Recent Briefs"
              : `${filtered.length} of ${briefs.length} brief${briefs.length !== 1 ? "s" : ""}`}
          </h2>
          <motion.button
            onClick={() => router.push("/generate")}
            className="btn-primary text-xs gap-1.5 px-4 py-2"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={12} weight="bold" />
            New Brief
          </motion.button>
        </div>

        {/* Briefs grid or empty */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.15 }}
            className="rounded-xl border border-white/10 bg-white/[0.02] flex flex-col items-center justify-center py-20 px-6 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mb-5">
              <Files size={24} weight="duotone" className="text-primary" />
            </div>
            <p className="text-base font-semibold text-on-surface">
              {search || statusFilter !== "all"
                ? "No briefs match your search"
                : "No briefs yet"}
            </p>
            <p className="mt-1.5 text-sm text-on-surface/55 max-w-sm">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filter."
                : "Paste a client message and turn chaos into a professional brief, scope of work, and payment terms in seconds."}
            </p>
            {!search && statusFilter === "all" && (
              <div className="flex items-center gap-3 mt-6">
                <motion.button
                  onClick={() => router.push("/generate")}
                  className="btn-primary gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Lightning size={14} weight="fill" />
                  Generate Your First Brief
                </motion.button>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((brief, i) => (
              <motion.div
                key={brief.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, type: "spring", stiffness: 100, damping: 18 }}
              >
                <BriefCard
                  id={brief.id}
                  title={brief.title}
                  clientName={brief.client_name}
                  status={brief.status}
                  createdAt={brief.created_at}
                  onDeleted={(id) => setBriefs((prev) => prev.filter((b) => b.id !== id))}
                  onStatusChanged={(id, status) =>
                    setBriefs((prev) =>
                      prev.map((b) => (b.id === id ? { ...b, status: status as Brief["status"] } : b)),
                    )
                  }
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
