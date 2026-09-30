"use client"

import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock3,
  LayoutList,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { DayPlanTab } from "@/components/day-plans/day-plan-tab"
import { clientsApi, cyclesApi } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { Client, ServiceCycleWithPlan } from "@/types/index"

const statusConfig = {
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
  })
}

interface ClientWithCycles {
  client: Client
  cycles: ServiceCycleWithPlan[]
}

export default function PlannerPage() {
  const [filter, setFilter] = useState<
    "all" | "active" | "upcoming" | "completed"
  >("all")
  const [view, setView] = useState<"cycles" | "day">("cycles")

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll(),
  })

  const clientCyclesQuery = useQuery({
    queryKey: ["planner"],
    queryFn: async () => {
      const clients = clientsQuery.data ?? []
      const settled: ClientWithCycles[] = await Promise.all(
        clients.map(async (client) => {
          const cycles = await cyclesApi.list(client.id)
          return { client, cycles }
        }),
      )
      return settled.filter(
        ({ cycles }): boolean => cycles.length > 0,
      )
    },
    enabled: clientsQuery.isSuccess,
    refetchOnWindowFocus: true,
  })

  const clientCycles = clientCyclesQuery.data ?? []
  const isLoading = clientsQuery.isLoading || clientCyclesQuery.isLoading

  const filteredClients = clientCycles
    .map(({ client, cycles }) => ({
      client,
      cycles:
        filter === "all" ? cycles : cycles.filter((c) => c.status === filter),
    }))
    .filter(({ cycles }) => cycles.length > 0)

  const activeCount = clientCycles.reduce(
    (sum, { cycles }) =>
      sum + cycles.filter((c) => c.status === "active").length,
    0,
  )
  const upcomingCount = clientCycles.reduce(
    (sum, { cycles }) =>
      sum + cycles.filter((c) => c.status === "upcoming").length,
    0,
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Planner" },
          ]}
        />
        <div className="text-center py-12">
          <p className="text-[#71717a]">Loading planner data...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="space-y-6"
      style={{
        backgroundColor: "var(--color-bg-app)",
        minHeight: "100vh",
        margin: "-24px",
        padding: "32px",
      }}
    >
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Planner" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-white">
            Content Planner
          </h1>
          <p className="mt-1 text-[13px] text-[#71717a]">
            Overview of all client service cycles and content plans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Badge className="bg-emerald-400/10 text-emerald-400 border-0">
              {activeCount} Active
            </Badge>
          )}
          {upcomingCount > 0 && (
            <Badge className="bg-blue-400/10 text-blue-400 border-0">
              {upcomingCount} Upcoming
            </Badge>
          )}
        </div>
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1 border-b border-[rgba(255,255,255,0.05)]">
        {(["cycles", "day"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            className={cn(
              "px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all capitalize cursor-pointer",
              view === tab
                ? "border-[var(--primary)] text-white font-semibold"
                : "border-transparent text-[#71717a] hover:text-[#a1a1aa]",
            )}
          >
            {tab === "day" ? "Day Plan" : "Cycles"}
          </button>
        ))}
      </div>

      {view === "day" ? (
        <DayPlanTab clients={clientsQuery.data ?? []} />
      ) : (
        <>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-[rgba(255,255,255,0.05)]">
        {(["all", "active", "upcoming", "completed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all capitalize cursor-pointer",
              filter === tab
                ? "border-[var(--primary)] text-white font-semibold"
                : "border-transparent text-[#71717a] hover:text-[#a1a1aa]",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Client cards */}
      {filteredClients.length === 0 ? (
        <Card className="rounded-[10px] border-0 bg-[#161616] p-8 shadow-none">
          <div className="text-center">
            <LayoutList className="mx-auto h-10 w-10 text-[#71717a] mb-3" />
            <h3 className="text-[14px] font-medium text-white">
              No plans found
            </h3>
            <p className="mt-1 text-[13px] text-[#71717a]">
              {filter === "all"
                ? "Create a service cycle on any client to see it here."
                : `No ${filter} cycles found.`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredClients.map(({ client, cycles }) => (
            <Card
              key={client.id}
              className="rounded-[10px] border-0 bg-[#161616] p-5 shadow-none"
            >
              {/* Client header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                    <span className="text-[13px] font-bold">
                      {client.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-[14px] font-medium text-white">
                      {client.name}
                    </h2>
                    <p className="text-[11px] text-[#71717a]">
                      {cycles.length} cycle{cycles.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="flex items-center gap-1.5 text-[12px] text-[var(--primary)] hover:text-[#818cf8] transition-colors"
                >
                  View Client
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Cycles */}
              <div className="space-y-3">
                {cycles.map((cycle) => {
                  const config = statusConfig[cycle.status]
                  const Icon = config.icon
                  const totalPlanned =
                    cycle.reelsTarget + cycle.postersTarget
                  const madeReels =
                    cycle.plans.reduce(
                      (s, p) => s + (p.madeReels ?? 0),
                      0,
                    ) + cycle.alreadyPublishedReels
                  const madePosters =
                    cycle.plans.reduce(
                      (s, p) => s + (p.madePosters ?? 0),
                      0,
                    ) + cycle.alreadyPublishedPosters
                  const pubReels =
                    cycle.plans.reduce(
                      (s, p) => s + (p.publishedReels ?? 0),
                      0,
                    ) + cycle.alreadyPublishedReels
                  const pubPosters =
                    cycle.plans.reduce(
                      (s, p) => s + (p.publishedPosters ?? 0),
                      0,
                    ) + cycle.alreadyPublishedPosters
                  const madeTotal = madeReels + madePosters
                  const pubTotal = pubReels + pubPosters
                  // Designer-work progress moves on upload; publication
                  // progress moves only on publish.
                  const madePct =
                    totalPlanned > 0
                      ? Math.round((madeTotal / totalPlanned) * 100)
                      : 0
                  const pubPct =
                    totalPlanned > 0
                      ? Math.round((pubTotal / totalPlanned) * 100)
                      : 0

                  return (
                    <div
                      key={cycle.id}
                      className={cn(
                        "rounded-lg border p-4 transition-colors",
                        cycle.status === "active"
                          ? "border-[var(--primary)]/20 bg-[#1a1a1a]"
                          : "border-[rgba(255,255,255,0.05)] bg-[#1a1a1a]",
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex size-7 items-center justify-center rounded-md",
                              config.color,
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              config.color,
                            )}
                          >
                            {config.label}
                          </Badge>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-[#71717a]" />
                            <span className="text-[12px] text-[#71717a]">
                              {formatDate(cycle.startDate)} —{" "}
                              {formatDate(cycle.endDate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Designer work (made) */}
                      <div className="flex items-center gap-4 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#71717a]">
                            Made — Reels:
                          </span>
                          <span className="text-[12px] font-mono text-white">
                            {madeReels} / {cycle.reelsTarget}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#71717a]">
                            Posters:
                          </span>
                          <span className="text-[12px] font-mono text-white">
                            {madePosters} / {cycle.postersTarget}
                          </span>
                        </div>
                        <span className="text-[14px] font-medium text-white">
                          {madePct}%
                        </span>
                      </div>

                      {/* Publication */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-emerald-400">
                            Published — Reels:
                          </span>
                          <span className="text-[12px] font-mono text-emerald-400">
                            {pubReels} / {cycle.reelsTarget}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-emerald-400">
                            Posters:
                          </span>
                          <span className="text-[12px] font-mono text-emerald-400">
                            {pubPosters} / {cycle.postersTarget}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500">
                          {pubPct}%
                        </span>
                      </div>

                      {/* Weekly plan table (only for active cycles) */}
                      {cycle.status === "active" && cycle.plans.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="border-b border-[rgba(255,255,255,0.05)]">
                                <th className="pb-1.5 text-left text-[9px] font-medium uppercase tracking-wider text-[#71717a]">
                                  Week
                                </th>
                                <th className="pb-1.5 text-left text-[9px] font-medium uppercase tracking-wider text-[#71717a]">
                                  Dates
                                </th>
                                <th className="pb-1.5 text-center text-[9px] font-medium uppercase tracking-wider text-[#ec4899]">
                                  Reels
                                </th>
                                <th className="pb-1.5 text-center text-[9px] font-medium uppercase tracking-wider text-[#3b82f6]">
                                  Posters
                                </th>
                                <th className="pb-1.5 text-center text-[9px] font-medium uppercase tracking-wider text-emerald-400">
                                  Published
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {cycle.plans.map((plan) => (
                                <tr
                                  key={plan.id}
                                  className="border-b border-[rgba(255,255,255,0.02)]"
                                >
                                  <td className="py-1.5 font-medium text-white">
                                    W{plan.weekNumber}
                                  </td>
                                  <td className="py-1.5 text-[#a1a1aa]">
                                    {formatDate(plan.weekStart)} —{" "}
                                    {formatDate(plan.weekEnd)}
                                  </td>
                                  <td className="py-1.5 text-center font-mono text-white">
                                    {plan.madeReels}/{plan.plannedReels}
                                  </td>
                                  <td className="py-1.5 text-center font-mono text-white">
                                    {plan.madePosters}/
                                    {plan.plannedPosters}
                                  </td>
                                  <td className="py-1.5 text-center font-mono text-emerald-400">
                                    {plan.publishedReels + plan.publishedPosters > 0
                                      ? `${plan.publishedReels}R ${plan.publishedPosters}P`
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  )
}
