"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Sparkle, ArrowRight } from "@phosphor-icons/react";
import { OutputView } from "@/components/BriefOutput/OutputView";
import type { GeneratedBrief } from "@/types/brief";

interface BriefData {
  title: string;
  client_name: string;
  generated_brief: GeneratedBrief;
  status: string;
  created_at: string;
}

export default function BriefSharePage() {
  const params = useParams();
  const token = params.token as string;
  const [brief, setBrief] = useState<BriefData | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/share?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => setBrief(data.brief))
      .catch(() => {});
  }, [token]);

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {!brief ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <p className="text-sm text-on-surface/55">
              Loading brief...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface/55">
                Project Brief
              </p>
              <h1 className="mt-2 text-display-md font-bold text-on-surface">
                {brief.title}
              </h1>
              <p className="mt-1 text-sm text-on-surface/55">
                Prepared for {brief.client_name}
              </p>
            </div>

            <OutputView brief={brief.generated_brief} />

            {/* Sign-up CTA */}
            <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <Sparkle size={20} weight="fill" className="text-primary" />
              </div>
              <p className="text-base font-semibold text-on-surface">
                Create your own professional briefs
              </p>
              <p className="mt-1 text-sm text-on-surface/55 max-w-md mx-auto">
                ScopeDrop turns messy client messages into structured scopes of work, timelines, and payment terms in seconds.
              </p>
              <Link
                href="/sign-up"
                className="mt-5 inline-flex items-center gap-2 btn-primary text-sm"
              >
                Get started free
                <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
