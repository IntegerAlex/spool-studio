"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { clientReferencesApi, dayPlansApi } from "@/lib/api-client"
import type { Client, DayPlan, User } from "@/types/index"

interface DayPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  designers: User[]
  clients: Client[]
  prefill?: Partial<DayPlan>
  onSaved: () => void
}

const inputCls =
  "h-9 bg-[#1a1a1a] border-[rgba(255,255,255,0.08)] text-[13px] text-white"

interface ClientWork {
  kind: "reel" | "poster"
  qty: string
}

function yesterdayOf(date: string): string {
  const d = new Date(date + "T00:00:00")
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function DayPlanDialog({
  open,
  onOpenChange,
  date,
  designers,
  clients,
  prefill,
  onSaved,
}: DayPlanDialogProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [designerId, setDesignerId] = useState(prefill?.designerId ?? "")
  const [clientIds, setClientIds] = useState<string[]>(
    prefill?.clientId ? [prefill.clientId] : [],
  )
  const [work, setWork] = useState<Record<string, ClientWork>>({})
  const [refIds, setRefIds] = useState<string[]>(prefill?.referenceIds ?? [])

  const isEditing = Boolean(prefill?.id)

  useEffect(() => {
    if (open) {
      setDesignerId(prefill?.designerId ?? "")
      setClientIds(prefill?.clientId ? [prefill.clientId] : [])
      setWork(
        prefill?.clientId
          ? {
              [prefill.clientId]: {
                kind: prefill.kind ?? "reel",
                qty: String(prefill.qty ?? 1),
              },
            }
          : {},
      )
      setRefIds(prefill?.referenceIds ?? [])
    }
  }, [open, prefill])

  // Already-assigned work for this designer + day (shown beside each client).
  const dayQuery = useQuery({
    queryKey: ["dayplans", date, designerId],
    queryFn: () => dayPlansApi.list(date, designerId),
    enabled: open && designerId !== "",
  })
  const alreadyFor = (clientId: string): string => {
    const rows = (dayQuery.data ?? []).filter(
      (t) => t.clientId === clientId && t.id !== prefill?.id,
    )
    if (rows.length === 0) return "nothing yet"
    const reels = rows.reduce(
      (s, t) => s + (t.kind === "reel" ? t.qty : 0),
      0,
    )
    const posters = rows.reduce(
      (s, t) => s + (t.kind === "poster" ? t.qty : 0),
      0,
    )
    return [
      reels > 0 ? `${reels} reel${reels > 1 ? "s" : ""}` : "",
      posters > 0 ? `${posters} poster${posters > 1 ? "s" : ""}` : "",
    ]
      .filter(Boolean)
      .join(" + ")
  }

  const singleClient = !isEditing && clientIds.length === 1 ? clientIds[0] : ""
  const refsQuery = useQuery({
    queryKey: ["references", singleClient],
    queryFn: () => clientReferencesApi.getByClientId(singleClient),
    enabled: open && singleClient !== "",
  })
  const references = refsQuery.data ?? []

  // Pending carry-forward: designer's open tasks before this date.
  const pendingQuery = useQuery({
    queryKey: ["dayplans-pending", designerId, date],
    queryFn: () =>
      dayPlansApi.history(designerId, "2000-01-01", yesterdayOf(date)),
    enabled: open && !isEditing && designerId !== "",
  })
  const pending =
    pendingQuery.data?.filter(
      (t) => t.status === "pending" || t.status === "in_progress",
    ) ?? []

  const toggleClient = (id: string) => {
    if (isEditing) return
    setClientIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((c) => c !== id)
        setWork((w) => {
          const copy = { ...w }
          delete copy[id]
          return copy
        })
        return next
      }
      setWork((w) => ({ ...w, [id]: w[id] ?? { kind: "reel", qty: "1" } }))
      return [...prev, id]
    })
    setRefIds([])
  }

  const setClientWork = (id: string, patch: Partial<ClientWork>) => {
    setWork((w) => {
      const prev: ClientWork = w[id] ?? { kind: "reel", qty: "1" }
      return { ...w, [id]: { ...prev, ...patch } }
    })
  }

  const toggleRef = (id: string) => {
    setRefIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    )
  }

  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.name ?? "Client"

  const carryForward = async (task: DayPlan) => {
    try {
      await dayPlansApi.create({
        date,
        designerId: task.designerId,
        clientId: task.clientId,
        cycleId: task.cycleId ?? undefined,
        kind: task.kind,
        qty: task.qty,
        referenceIds: task.referenceIds,
      })
      onSaved()
      pendingQuery.refetch()
      dayQuery.refetch()
      toast({ title: `Carried into ${date}` })
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to carry over",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!designerId || clientIds.length === 0) {
      toast({
        title: "Designer and at least one client are required",
        variant: "destructive",
      })
      return
    }
    const parsed = clientIds.map((cid) => ({
      cid,
      kind: work[cid]?.kind ?? "reel",
      qty: parseInt(work[cid]?.qty ?? "1", 10),
    }))
    if (parsed.some((p) => isNaN(p.qty) || p.qty < 1 || p.qty > 20)) {
      toast({ title: "Each quantity must be 1–20", variant: "destructive" })
      return
    }
    setIsSaving(true)
    try {
      if (prefill?.id) {
        const only = parsed[0]
        await dayPlansApi.update(prefill.id, {
          designerId,
          date,
          kind: only.kind,
          qty: only.qty,
          referenceIds: refIds,
        })
      } else {
        // One task row per client, each with its own type + qty. No caps.
        for (const p of parsed) {
          await dayPlansApi.create({
            date,
            designerId,
            clientId: p.cid,
            kind: p.kind,
            qty: p.qty,
            referenceIds: clientIds.length === 1 ? refIds : [],
          })
        }
      }
      onSaved()
      onOpenChange(false)
      toast({
        title:
          prefill?.id || clientIds.length === 1
            ? "Task assigned"
            : `${clientIds.length} tasks assigned`,
      })
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to save task",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#161616] border-[rgba(255,255,255,0.08)] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? "Edit Task" : "Assign Task"} — {date}
          </DialogTitle>
          <DialogDescription className="text-[#71717a]">
            {isEditing
              ? "Update this task."
              : "Pick a designer, any number of clients, and the work."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">
              Designer
            </label>
            <select
              value={designerId}
              onChange={(e) => setDesignerId(e.target.value)}
              className={`${inputCls} w-full rounded-md px-2`}
            >
              <option value="">Select</option>
              {designers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">
              Clients ({clientIds.length} selected)
            </label>
            <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1a1a1a] p-2">
              {clients.map((c) => (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-2 text-[12px] text-white ${isEditing && !clientIds.includes(c.id) ? "opacity-40" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={clientIds.includes(c.id)}
                    onChange={() => toggleClient(c.id)}
                    disabled={isEditing}
                    className="accent-indigo-500"
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              ))}
            </div>
          </div>

          {clientIds.map((cid) => (
            <div
              key={cid}
              className="space-y-2 rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1a1a1a] p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-white">
                  {clientName(cid)}
                </span>
                {designerId !== "" && (
                  <span className="text-[11px] text-[#71717a]">
                    {date}: {alreadyFor(cid)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={work[cid]?.kind ?? "reel"}
                  onChange={(e) =>
                    setClientWork(cid, {
                      kind: e.target.value as "reel" | "poster",
                    })
                  }
                  className={`${inputCls} w-full rounded-md px-2`}
                >
                  <option value="reel">Reel</option>
                  <option value="poster">Poster</option>
                </select>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={work[cid]?.qty ?? "1"}
                  onChange={(e) => setClientWork(cid, { qty: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          ))}

          {singleClient !== "" && references.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">
                References
              </label>
              <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1a1a1a] p-2">
                {references.map((r) => (
                  <label
                    key={r.id}
                    className="flex cursor-pointer items-center gap-2 text-[12px] text-white"
                  >
                    <input
                      type="checkbox"
                      checked={refIds.includes(r.id)}
                      onChange={() => toggleRef(r.id)}
                      className="accent-indigo-500"
                    />
                    <span className="truncate">{r.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!isEditing && designerId !== "" && pending.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">
                Still pending — tap to carry into {date}
              </label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-[rgba(255,255,255,0.08)] bg-[#1a1a1a] p-2">
                {pending.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 text-[12px] text-white"
                  >
                    <span className="truncate">
                      {t.date} · {t.qty} {t.kind}
                      {t.qty > 1 ? "s" : ""} · {clientName(t.clientId)}
                    </span>
                    <button
                      type="button"
                      onClick={() => carryForward(t)}
                      className="shrink-0 rounded border border-[rgba(255,255,255,0.12)] px-2 py-0.5 text-[11px] text-white hover:bg-[rgba(255,255,255,0.06)]"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 border-[rgba(255,255,255,0.08)] bg-transparent text-[13px] text-white hover:bg-[rgba(255,255,255,0.06)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-9 bg-[var(--primary)] text-[13px] text-white hover:bg-[#4f46e5]"
            >
              {isSaving ? "Saving..." : isEditing ? "Save" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
