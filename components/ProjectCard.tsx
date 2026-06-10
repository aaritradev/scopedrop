import Link from "next/link";
import { FolderOpen, DotsThree, Check, Clock, Money, Paperclip } from "@phosphor-icons/react";
import { formatPrice } from "@/lib/currency";

interface ProjectCardProps {
  id: string;
  clientName: string;
  title?: string;
  status: string;
  portalSlug: string;
  createdAt: string;
  unpaidAmountPaise?: number;
}

const statusColors: Record<string, string> = {
  not_started: "rgba(255,255,255,0.4)",
  in_progress: "#3b82f6",
  in_review: "#fbbf24",
  delivered: "#a855f7",
  paid: "#10b981",
};

const statusLabels: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  in_review: "In Review",
  delivered: "Delivered",
  paid: "Paid",
};

export function ProjectCard({ id, clientName, title, status, createdAt, unpaidAmountPaise }: ProjectCardProps) {
  return (
    <Link href={`/dashboard/project/${id}`} className="block group">
      <div className="card-base p-5 hover:border-white/20 transition-colors h-full flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: statusColors[status] || statusColors.not_started }}
            />
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: statusColors[status] || statusColors.not_started }}
            >
              {statusLabels[status] || "Unknown"}
            </span>
          </div>
          <span className="text-[11px] text-on-surface/40">
            {new Date(createdAt).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              year: "numeric"
            })}
          </span>
        </div>
        
        <h3 className="text-base font-bold text-on-surface mb-1 truncate">
          {clientName}
        </h3>
        
        <p className="text-sm text-on-surface/60 line-clamp-2 mb-4 flex-grow">
          {title || "No scope attached"}
        </p>
        
        <div className="flex items-center gap-3 pt-4 border-t border-white/5 mt-auto">
          {unpaidAmountPaise ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-400/10 px-2 py-1 rounded">
              <Money size={14} />
              {formatPrice(unpaidAmountPaise, "INR")} Due
            </div>
          ) : (
             <div className="flex items-center gap-1.5 text-xs text-on-surface/40 font-medium">
               <FolderOpen size={14} />
               Manage Portal
             </div>
          )}
        </div>
      </div>
    </Link>
  );
}
