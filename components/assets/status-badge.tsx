"use client"

import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AssetStatus } from "@/types/index"

interface StatusBadgeProps {
  status: AssetStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const labels = {
    draft: "Draft",
    uploading: "Uploading",
    uploaded: "Uploaded",
    processing: "Processing",
    approved: "Approved",
    published: "Published",
    failed: "Failed",
    archived: "Archived",
    in_design: "Draft",
    ready_for_review: "Draft",
    revision_requested: "Revision",
    scheduled: "Scheduled",
  } satisfies Record<AssetStatus, string>

  const styles = {
    draft: "status-badge-draft",
    uploading:
      "border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.15)] text-emerald-400",
    uploaded:
      "border-[rgba(20,184,166,0.3)] bg-[rgba(20,184,166,0.15)] text-[#2dd4bf]",
    processing:
      "border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.15)] text-[#c084fc]",
    approved: "status-badge-approved",
    published: "status-badge-published",
    failed:
      "border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.15)] text-[#f87171]",
    archived:
      "border-[rgba(113,113,122,0.15)] bg-[rgba(113,113,122,0.1)] text-[#52525b]",
    in_design: "status-badge-draft",
    ready_for_review: "status-badge-draft",
    revision_requested: "status-badge-revision",
    scheduled:
      "border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.15)] text-emerald-400",
  }

  return (
    <Badge
      className={cn(
        "inline-flex h-[18px] rounded-full border px-2 py-0 text-[10px] font-medium capitalize leading-none",
        styles[status],
        className,
      )}
    >
      {(status === "uploading" || status === "processing") && (
        <span
          className={cn(
            "mr-1 size-[6px] rounded-full bg-current animate-status-pulse",
          )}
        />
      )}
      {status === "published" && <Check className="mr-1 h-3 w-3" />}
      {labels[status]}
    </Badge>
  )
}
