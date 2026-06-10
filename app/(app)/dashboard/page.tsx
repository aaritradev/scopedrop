"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Files, Plus, PaperPlaneTilt, Signature, Lightning, Sparkle, MagnifyingGlass, ArrowDown, ArrowUp, FolderOpen, Money, CheckCircle } from "@phosphor-icons/react";
import { BriefCard } from "@/components/BriefCard";
import { ProjectCard } from "@/components/ProjectCard";
import { FREE_MONTHLY_CREDITS, getFeatureUpgradeMessage } from "@/lib/billing";
import { formatPrice } from "@/lib/currency";

interface Brief {
  id: string;
  title: string;
  client_name: string;
  status: "draft" | "sent" | "signed";
  created_at: string;
  share_token: string;
}

interface Project {
  id: string;
  client_name: string;
  client_email: string;
  status: string;
  portal_slug: string;
  created_at: string;
  scope_id: string;
  briefs?: { title: string };
  invoices?: { id: string; amount: number; currency: string; status: string }[];
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
    </div>
  );
}

type TabType = "projects" | "briefs";
type StatusFilter = "all" | "draft" | "sent" | "signed" | "not_started" | "in_progress" | "in_review" | "delivered" | "paid";
type SortOrder = "newest" | "oldest";

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("projects");
  
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<any>(null);
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
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/me").then((r) => r.json()).catch(() => ({ user: null })),
    ])
      .then(([briefsData, projectsData, meData]) => {
        setBriefs(briefsData.briefs ?? []);
        setHistory(briefsData.history ?? null);
        setProjects(projectsData.projects ?? []);
        setProjectStats(projectsData.stats ?? null);
        setMe(meData.user ?? null);
      })
      .finally(() => setLoading(false));
  }, [isSignedIn, isLoaded, router]);

  // Reset filters when tab changes
  useEffect(() => {
    setSearch("");
    setStatusFilter("all");
  }, [activeTab]);

  const filteredBriefs = useMemo(() => {
    let result = [...briefs];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(b => b.title.toLowerCase().includes(q) || b.client_name.toLowerCase().includes(q));
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

  const filteredProjects = useMemo(() => {
    let result = [...projects];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p => p.client_name.toLowerCase().includes(q) || (p.briefs?.title || "").toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    result.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
    return result;
  }, [projects, search, statusFilter, sortOrder]);

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
              Manage your client portals and scope documents.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5">
            <Sparkle size={14} weight="fill" className="text-primary" />
            <span className="text-xs text-on-surface/55">
              {me?.plan === "pro" ? "Pro Plan" : me?.plan === "starter" ? "Starter Plan" : "Free Plan"}
            </span>
          </div>
        </div>

        {/* Top Tabs */}
        <div className="flex border-b border-white/10 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === "projects" ? "text-on-surface" : "text-on-surface/50 hover:text-on-surface/80"
            }`}
          >
            Client Projects
            {activeTab === "projects" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("briefs")}
            className={`px-6 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === "briefs" ? "text-on-surface" : "text-on-surface/50 hover:text-on-surface/80"
            }`}
          >
            Scope Documents
            {activeTab === "briefs" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Stats */}
        {activeTab === "projects" ? (
          <div className="grid gap-4 sm:grid-cols-3 mb-8">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-on-surface/50 uppercase tracking-wider">Active Projects</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10"><FolderOpen size={15} className="text-blue-400" /></div>
              </div>
              <p className="tabular text-2xl font-bold text-on-surface">{projectStats?.activeProjects || 0}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-on-surface/50 uppercase tracking-wider">Pending Approvals</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10"><CheckCircle size={15} className="text-amber-400" /></div>
              </div>
              <p className="tabular text-2xl font-bold text-on-surface">{projectStats?.pendingApprovals || 0}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-on-surface/50 uppercase tracking-wider">Unpaid Invoices</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10"><Money size={15} className="text-emerald-400" /></div>
              </div>
              <p className="tabular text-2xl font-bold text-on-surface">{formatPrice(projectStats?.unpaidTotalPaise || 0, "INR")}</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3 mb-8">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-on-surface/50 uppercase tracking-wider">Total Scopes</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><Files size={15} className="text-primary" /></div>
              </div>
              <p className="tabular text-2xl font-bold text-on-surface">{briefs.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-on-surface/50 uppercase tracking-wider">Sent</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10"><PaperPlaneTilt size={15} className="text-emerald-400" /></div>
              </div>
              <p className="tabular text-2xl font-bold text-on-surface">{briefs.filter((b) => b.status === "sent").length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-on-surface/50 uppercase tracking-wider">Signed</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-300/10"><Signature size={15} className="text-emerald-300" /></div>
              </div>
              <p className="tabular text-2xl font-bold text-on-surface">{briefs.filter((b) => b.status === "signed").length}</p>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="mb-6 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="input-base h-9 pl-9 pr-3 text-sm"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto">
            {activeTab === "briefs" ? (
              (["all", "draft", "sent", "signed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
                  style={{
                    color: statusFilter === s ? "#e3e2e5" : "rgba(227,226,229,0.45)",
                    backgroundColor: statusFilter === s ? "rgba(255,149,0,0.12)" : "transparent",
                  }}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))
            ) : (
              (["all", "not_started", "in_progress", "in_review", "delivered", "paid"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap"
                  style={{
                    color: statusFilter === s ? "#e3e2e5" : "rgba(227,226,229,0.45)",
                    backgroundColor: statusFilter === s ? "rgba(59,130,246,0.12)" : "transparent",
                  }}
                >
                  {s === "all" ? "All" : s.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-on-surface/55 hover:text-on-surface transition-colors shrink-0"
          >
            {sortOrder === "newest" ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
            {sortOrder === "newest" ? "Newest" : "Oldest"}
          </button>
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wider">
            {activeTab === "projects" ? "Your Projects" : "Your Scopes"}
          </h2>
          <motion.button
            onClick={() => router.push("/generate")}
            className="btn-primary text-xs gap-1.5 px-4 py-2"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={12} weight="bold" />
            {activeTab === "projects" ? "New Project" : "New Scope"}
          </motion.button>
        </div>

        {/* Content Grid */}
        {activeTab === "projects" ? (
          filteredProjects.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 mb-5">
                <FolderOpen size={24} className="text-blue-400" />
              </div>
              <p className="text-base font-semibold text-on-surface">No projects found</p>
              <p className="mt-1.5 text-sm text-on-surface/55 max-w-sm">
                Create a scope document first, then turn it into a client portal project.
              </p>
              <button onClick={() => router.push("/generate")} className="btn-primary mt-6 text-sm">
                Start a New Project
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {filteredProjects.map((p, i) => {
                const unpaid = (p.invoices ?? []).filter((inv) => inv.status === "unpaid");
                const unpaidAmount = unpaid.reduce((sum, inv) => sum + inv.amount, 0);
                
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <ProjectCard
                      id={p.id}
                      clientName={p.client_name}
                      title={p.briefs?.title}
                      status={p.status}
                      portalSlug={p.portal_slug}
                      createdAt={p.created_at}
                      unpaidAmountPaise={unpaidAmount > 0 ? unpaidAmount : undefined}
                    />
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          filteredBriefs.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mb-5">
                <Files size={24} className="text-primary" />
              </div>
              <p className="text-base font-semibold text-on-surface">No scopes found</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredBriefs.map((b, i) => (
                <motion.div key={b.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <BriefCard
                    id={b.id}
                    title={b.title}
                    clientName={b.client_name}
                    status={b.status}
                    createdAt={b.created_at}
                    onDeleted={(id) => setBriefs(prev => prev.filter(x => x.id !== id))}
                    onStatusChanged={(id, st) => setBriefs(prev => prev.map(x => x.id === id ? { ...x, status: st as Brief["status"] } : x))}
                  />
                </motion.div>
              ))}
            </div>
          )
        )}
      </motion.div>
    </div>
  );
}
