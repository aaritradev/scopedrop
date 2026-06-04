"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { OutputView } from "@/components/BriefOutput/OutputView";
import type { GeneratedBrief } from "@/types/brief";

interface BriefData {
  id: string;
  title: string;
  client_name: string;
  raw_input: string;
  generated_brief: GeneratedBrief;
  status: string;
  share_token: string;
  created_at: string;
}

export default function BriefEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [briefData, setBriefData] = useState<GeneratedBrief | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBrief = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/briefs/${id}`);
      if (!res.ok) { router.push("/dashboard"); return; }
      const data = await res.json();
      setBrief(data.brief);
      setBriefData(data.brief.generated_brief);
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchBrief(); }, [fetchBrief]);

  const handleSave = async (updated: GeneratedBrief) => {
    if (!brief) return;
    const res = await fetch(`/api/briefs/${brief.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generated_brief: updated }),
    });
    if (!res.ok) throw new Error("Save failed");
    router.push(`/briefs/${brief.id}`);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="h-7 w-48 rounded shimmer" />
        <div className="mt-8 h-96 rounded-xl shimmer" />
      </div>
    );
  }

  if (!brief || !briefData) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href={`/briefs/${brief.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-on-surface/50 hover:text-on-surface transition-colors"
      >
        <ArrowLeft size={14} />
        Back to brief
      </Link>

      <div className="mb-6">
        <h1 className="text-display-md font-bold text-on-surface">
          Edit Brief
        </h1>
        <p className="mt-1 text-sm text-on-surface/55">
          {brief.title}
        </p>
      </div>

      <OutputView
        briefId={brief.id}
        brief={briefData}
        editable
        onChange={setBriefData}
        onSave={handleSave}
        shareToken={brief.share_token}
      />
    </div>
  );
}
