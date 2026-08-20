"use client"

import { Calendar, CheckCircle2, Clock3, Pause, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ServiceCycle } from "@/types/index"

const statusConfig: Record<
  ServiceCycle["status"],
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  upcoming: {
    label: "Upcoming",
    color: "text-blue-400 bg-blue-400/10",
    icon: Clock3,
  },
  active: {
    label: "Active",
    color: "text-emerald-400 bg-emerald-400/10",
    icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    color: "text-zinc-400 bg-zinc-400/10",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-400 bg-red-400/10",
    icon: XCircle,
  },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

interface CycleCardProps {
  cycle: ServiceCycle & {
    totalReelsPlanned?: number
    totalPostersPlanned?: number
    totalReelsPublished?: number
    totalPostersPublished?: number
  }
  isActive?: boolean
  onComplete?: (cycleId: string) => void
  onCancel?: (cycleId: string) => void
  onRenew?: (cycle: ServiceCycle) => void
  onEdit?: (cycle: ServiceCycle) => void
}

export function CycleCard({
  cycle,
  isActive,
  onComplete,
  onCancel,
  onRenew,
  onEdit,
}: CycleCardProps) {
  const config = statusConfig[cycle.status]
  const Icon = config.icon

  const totalPlanned =
    (cycle.totalReelsPlanned ?? cycle.reelsTarget) +
    (cycle.totalPostersPlanned ?? cycle.postersTarget)
  const totalPublished =
    (cycle.totalReelsPublished ?? 0) + (cycle.totalPostersPublished ?? 0)
  const progressPct =
    totalPlanned > 0 ? Math.round((totalPublished / totalPlanned) * 100) : 0

  return (
    <Card
      className={cn(
        "rounded-[10px] border bg-[#161616] p-4 shadow-none transition-colors",
        isActive
          ? "border-[var(--primary)]/30"
          : "border-[rgba(255,255,255,0.05)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              config.color,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-medium text-white">
                Service Cycle
              </h3>
              <Badge
                variant="secondary"
                className={cn("text-[10px] px-1.5 py-0", config.color)}
              >
                {config.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Calendar className="h-3 w-3 text-[#71717a]" />
              <span className="text-[12px] text-[#71717a]">
                {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
              </span>
            </div>
          </div>
        </div>

        {cycle.status === "active" && (
          <span className="text-[18px] font-medium text-white">
            {progressPct}%
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[rgba(255,255,255,0.05)] bg-[#1a1a1a] p-2.5 text-center">
          <p className="text-[9px] text-[#71717a] uppercase tracking-wider">
            Reels
          </p>
          <p className="text-[13px] font-semibold text-white mt-0.5">
            {cycle.totalReelsPublished ?? 0}{" "}
            <span className="text-[#71717a] font-normal">
              / {cycle.reelsTarget}
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-[rgba(255,255,255,0.05)] bg-[#1a1a1a] p-2.5 text-center">
          <p className="text-[9px] text-[#71717a] uppercase tracking-wider">
            Posters
          </p>
          <p className="text-[13px] font-semibold text-white mt-0.5">
            {cycle.totalPostersPublished ?? 0}{" "}
            <span className="text-[#71717a] font-normal">
              / {cycle.postersTarget}
            </span>
          </p>
        </div>
      </div>

      {cycle.status === "active" && (
        <div className="mt-3 flex gap-2">
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 flex-1 border-[rgba(255,255,255,0.08)] bg-transparent text-[11px] text-white hover:bg-[rgba(255,255,255,0.06)]"
              onClick={() => onEdit(cycle)}
            >
              Edit
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 border-[rgba(255,255,255,0.08)] bg-transparent text-[11px] text-white hover:bg-[rgba(255,255,255,0.06)]"
            onClick={() => onComplete?.(cycle.id)}
          >
            Complete
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 border-[rgba(255,255,255,0.08)] bg-transparent text-[11px] text-white hover:bg-[rgba(255,255,255,0.06)]"
            onClick={() => onCancel?.(cycle.id)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 flex-1 bg-[var(--primary)] text-[11px] text-white hover:bg-[#4f46e5]"
            onClick={() => onRenew?.(cycle)}
          >
            Renew
          </Button>
        </div>
      )}

      {cycle.status === "completed" && onRenew && (
        <div className="mt-3">
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-full border-[rgba(255,255,255,0.08)] bg-transparent text-[11px] text-white hover:bg-[rgba(255,255,255,0.06)]"
            onClick={() => onRenew(cycle)}
          >
            <Pause className="mr-1.5 h-3 w-3" />
            Create Next Cycle
          </Button>
        </div>
      )}
    </Card>
  )
}
