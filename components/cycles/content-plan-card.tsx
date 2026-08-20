"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ContentPlanRow } from "@/types/index"

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  })
}

function getStatusColor(planned: number, actual: number): string {
  if (planned === 0) return "text-[#71717a]"
  if (actual >= planned) return "text-emerald-400"
  if (actual >= planned * 0.8) return "text-yellow-400"
  return "text-red-400"
}

interface ContentPlanCardProps {
  plans: ContentPlanRow[]
  className?: string
}

export function ContentPlanCard({ plans, className }: ContentPlanCardProps) {
  if (!plans || plans.length === 0) {
    return (
      <Card
        className={cn(
          "rounded-[10px] border-0 bg-[#161616] p-5 shadow-none",
          className,
        )}
      >
        <h2 className="text-[13px] font-medium text-white">Content Plan</h2>
        <div className="mt-4 py-6 text-center text-[12px] text-[#71717a] border border-dashed border-[rgba(255,255,255,0.08)] rounded-md">
          No content plan generated yet. Create a service cycle to generate the
          weekly plan.
        </div>
      </Card>
    )
  }

  const totalPlannedReels = plans.reduce((sum, p) => sum + p.plannedReels, 0)
  const totalPlannedPosters = plans.reduce(
    (sum, p) => sum + p.plannedPosters,
    0,
  )
  const totalActualReels = plans.reduce(
    (sum, p) => sum + (p.actualReels ?? 0),
    0,
  )
  const totalActualPosters = plans.reduce(
    (sum, p) => sum + (p.actualPosters ?? 0),
    0,
  )

  return (
    <Card
      className={cn(
        "rounded-[10px] border-0 bg-[#161616] p-5 shadow-none",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-medium text-white">Content Plan</h2>
          <p className="mt-1 text-[12px] text-[#71717a]">
            {plans.length} weeks planned
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.05)]">
              <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-wider text-[#71717a]">
                Week
              </th>
              <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-wider text-[#71717a]">
                Dates
              </th>
              <th className="pb-2 text-center text-[10px] font-medium uppercase tracking-wider text-[#71717a]">
                <span className="text-[#ec4899]">Reels</span>
              </th>
              <th className="pb-2 text-center text-[10px] font-medium uppercase tracking-wider text-[#71717a]">
                <span className="text-[#3b82f6]">Posters</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => {
              const reelColor = getStatusColor(
                plan.plannedReels,
                plan.actualReels ?? 0,
              )
              const posterColor = getStatusColor(
                plan.plannedPosters,
                plan.actualPosters ?? 0,
              )

              return (
                <tr
                  key={plan.id}
                  className="border-b border-[rgba(255,255,255,0.03)]"
                >
                  <td className="py-2.5 text-[12px] font-medium text-white">
                    W{plan.weekNumber}
                  </td>
                  <td className="py-2.5 text-[11px] text-[#a1a1aa]">
                    {formatDate(plan.weekStart)} — {formatDate(plan.weekEnd)}
                  </td>
                  <td className="py-2.5 text-center">
                    <span className={cn("font-mono font-medium", reelColor)}>
                      {plan.actualReels ?? 0}
                    </span>
                    <span className="text-[#71717a]">
                      {" "}
                      / {plan.plannedReels}
                    </span>
                  </td>
                  <td className="py-2.5 text-center">
                    <span className={cn("font-mono font-medium", posterColor)}>
                      {plan.actualPosters ?? 0}
                    </span>
                    <span className="text-[#71717a]">
                      {" "}
                      / {plan.plannedPosters}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-[rgba(255,255,255,0.08)]">
              <td
                className="pt-2.5 text-[11px] font-semibold text-white"
                colSpan={2}
              >
                Total
              </td>
              <td className="pt-2.5 text-center font-mono text-[12px] font-semibold text-white">
                {totalActualReels}{" "}
                <span className="text-[#71717a] font-normal">
                  / {totalPlannedReels}
                </span>
              </td>
              <td className="pt-2.5 text-center font-mono text-[12px] font-semibold text-white">
                {totalActualPosters}{" "}
                <span className="text-[#71717a] font-normal">
                  / {totalPlannedPosters}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}
