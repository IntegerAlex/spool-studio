"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  authApi,
  dayPlansApi,
  usersApi,
} from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { Client, DayPlan, User } from "@/types/index"
import { DayPlanDialog } from "./day-plan-dialog"

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

const statusColor: Record<DayPlan["status"], string> = {
  pending: "text-zinc-400 bg-zinc-400/10",
  in_progress: "text-blue-400 bg-blue-400/10",
  done: "text-emerald-400 bg-emerald-400/10",
}

export function DayPlanTab({ clients }: { clients: Client[] }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [date, setDate] = useState(todayStr())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<DayPlan | undefined>(undefined)

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.getCurrentUser(),
  })
  const isAdmin = meQuery.data?.role === "admin"

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.getAll(),
    // Designers lack team:read, so they only ever see their own row below.
    enabled: isAdmin,
  })
  const designers = isAdmin
    ? (usersQuery.data ?? []).filter((u: User) => u.role === "designer")
    : meQuery.data && meQuery.data.role === "designer"
      ? [meQuery.data]
      : []

  const tasksQuery = useQuery({
    queryKey: ["dayplans", date],
    queryFn: () => dayPlansApi.list(date),
  })
  const tasks = tasksQuery.data ?? []

  const recsQuery = useQuery({
    queryKey: ["dayplans-recs", date],
    queryFn: () => dayPlansApi.recommendations(date),
    enabled: isAdmin,
  })
  const recs = recsQuery.data ?? []

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dayplans"] })
    queryClient.invalidateQueries({ queryKey: ["dayplans-recs"] })
  }

  const acceptRec = async (rec: {
    designerId: string
    clientId: string
    cycleId: string
    kind: "reel" | "poster"
    qty: number
  }) => {
    try {
      await dayPlansApi.create({
        date,
        designerId: rec.designerId,
        clientId: rec.clientId,
        cycleId: rec.cycleId,
        kind: rec.kind,
        qty: rec.qty,
      })
      refresh()
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to assign",
        variant: "destructive",
      })
    }
  }

  const advance = async (task: DayPlan) => {
    const next =
      task.status === "pending"
        ? "in_progress"
        : task.status === "in_progress"
          ? "done"
          : null
    if (!next) return
    try {
      await dayPlansApi.update(task.id, { status: next })
      refresh()
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to update",
        variant: "destructive",
      })
    }
  }

  const remove = async (id: string) => {
    try {
      await dayPlansApi.remove(id)
      refresh()
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to delete",
        variant: "destructive",
      })
    }
  }

  const setCapacity = async (designer: User, delta: number) => {
    const next = Math.min(20, Math.max(1, designer.dailyCapacityUnits + delta))
    if (next === designer.dailyCapacityUnits) return
    try {
      await usersApi.updateCapacity(designer.id, next)
      queryClient.invalidateQueries({ queryKey: ["users"] })
      queryClient.invalidateQueries({ queryKey: ["me"] })
      recsQuery.refetch()
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to update",
        variant: "destructive",
      })
    }
  }

  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.name ?? "Client"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="h-9 w-auto bg-[#1a1a1a] border-[rgba(255,255,255,0.08)] text-[13px] text-white"
        />
        {isAdmin && (
          <Button
            onClick={() => {
              setEditing(undefined)
              setDialogOpen(true)
            }}
            className="h-9 bg-[var(--primary)] text-[13px] text-white hover:bg-[#4f46e5]"
          >
            Assign Task
          </Button>
        )}
      </div>

      {isAdmin && recs.length > 0 && (
        <Card className="rounded-[10px] border-0 bg-[#161616] p-5 shadow-none">
          <h3 className="mb-3 text-[14px] font-medium text-white">
            Suggested for {date}
          </h3>
          <div className="space-y-2">
            {recs.map((r, i) => (
              <div
                key={`${r.designerId}-${r.cycleId}-${r.kind}-${i}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-[rgba(255,255,255,0.05)] bg-[#1a1a1a] p-3"
              >
                <div className="min-w-0">
                  <p className="text-[13px] text-white">
                    {designers.find((d) => d.id === r.designerId)?.name ??
                      "Designer"}{" "}
                    — {r.qty} {r.kind}
                    {r.qty > 1 ? "s" : ""} · {clientName(r.clientId)}
                  </p>
                  <p className="truncate text-[11px] text-[#71717a]">
                    {r.reason}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => acceptRec(r)}
                  className="h-8 shrink-0 border-[rgba(255,255,255,0.08)] bg-transparent text-[12px] text-white hover:bg-[rgba(255,255,255,0.06)]"
                >
                  Accept
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {designers.map((d) => {
        const mine = tasks.filter((t) => t.designerId === d.id)
        const done = mine.filter((t) => t.status === "done").length
        const reels = mine.reduce((s, t) => s + (t.kind === "reel" ? t.qty : 0), 0)
        const posters = mine.reduce(
          (s, t) => s + (t.kind === "poster" ? t.qty : 0),
          0,
        )
        return (
          <Card
            key={d.id}
            className="rounded-[10px] border-0 bg-[#161616] p-5 shadow-none"
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[14px] font-medium text-white">{d.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#a1a1aa]">
                  {mine.length} tasks
                  {(reels > 0 || posters > 0) &&
                    ` · ${reels > 0 ? `${reels} reels` : ""}${reels > 0 && posters > 0 ? " + " : ""}${posters > 0 ? `${posters} posters` : ""}`}
                </span>
                {isAdmin && (
                  <div className="flex items-center gap-1" title="Daily capacity">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCapacity(d, -1)}
                      className="h-7 w-7 border-[rgba(255,255,255,0.08)] bg-transparent p-0 text-white hover:bg-[rgba(255,255,255,0.06)]"
                    >
                      −
                    </Button>
                    <span className="font-mono text-[12px] text-[#a1a1aa]">
                      {d.dailyCapacityUnits}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCapacity(d, 1)}
                      className="h-7 w-7 border-[rgba(255,255,255,0.08)] bg-transparent p-0 text-white hover:bg-[rgba(255,255,255,0.06)]"
                    >
                      +
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
              <div
                className="h-full rounded-full bg-[var(--primary)]"
                style={{
                  width: `${mine.length > 0 ? Math.round((done / mine.length) * 100) : 0}%`,
                }}
              />
            </div>
            {mine.length === 0 ? (
              <p className="text-[12px] text-[#71717a]">No tasks this day.</p>
            ) : (
              <div className="space-y-2">
                {mine.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[rgba(255,255,255,0.05)] bg-[#1a1a1a] p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] text-white">
                        {t.qty} {t.kind}
                        {t.qty > 1 ? "s" : ""} · {clientName(t.clientId)}
                        {t.qty > 1 && (
                          <span className="text-[#71717a]">
                            {" "}
                            · {t.doneQty}/{t.qty} uploaded
                          </span>
                        )}
                        {t.referenceIds.length > 0 && (
                          <span className="text-[#71717a]">
                            {" "}
                            · {t.referenceIds.length} ref
                            {t.referenceIds.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        className={cn(
                          "border-0 text-[10px]",
                          statusColor[t.status],
                        )}
                      >
                        {t.status.replace("_", " ")}
                      </Badge>
                      {isAdmin && (
                        <>
                          {t.status !== "done" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => advance(t)}
                              className="h-7 border-[rgba(255,255,255,0.08)] bg-transparent text-[11px] text-white hover:bg-[rgba(255,255,255,0.06)]"
                            >
                              {t.status === "pending" ? "Start" : "Done"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(t)
                              setDialogOpen(true)
                            }}
                            className="h-7 border-[rgba(255,255,255,0.08)] bg-transparent text-[11px] text-white hover:bg-[rgba(255,255,255,0.06)]"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => remove(t.id)}
                            className="h-7 border-[rgba(255,255,255,0.08)] bg-transparent text-[11px] text-red-400 hover:bg-[rgba(255,255,255,0.06)]"
                          >
                            ×
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}

      <DayPlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={date}
        designers={designers}
        clients={clients}
        prefill={editing}
        onSaved={refresh}
      />
    </div>
  )
}
