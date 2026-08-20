"use client"

import { useEffect, useState } from "react"
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
import type { CreateCycleInput, ServiceCycle } from "@/types/index"

interface CycleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  prefill?: Partial<ServiceCycle>
  isEditing?: boolean
  onSubmit: (input: CreateCycleInput) => Promise<void>
}

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getDefaultDates(prefill?: Partial<ServiceCycle>) {
  if (prefill?.startDate && prefill?.endDate) {
    return {
      startDate: prefill.startDate.split("T")[0],
      endDate: prefill.endDate.split("T")[0],
    }
  }

  const today = new Date()
  const start = new Date(today)
  const end = new Date(today)
  end.setMonth(end.getMonth() + 1)
  end.setDate(end.getDate() - 1)

  return {
    startDate: toDateString(start),
    endDate: toDateString(end),
  }
}

export function CycleFormDialog({
  open,
  onOpenChange,
  clientId,
  prefill,
  isEditing,
  onSubmit,
}: CycleFormDialogProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const defaults = getDefaultDates(prefill)

  const [startDate, setStartDate] = useState(defaults.startDate)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [reelsTarget, setReelsTarget] = useState(
    String(prefill?.reelsTarget ?? 6),
  )
  const [postersTarget, setPostersTarget] = useState(
    String(prefill?.postersTarget ?? 7),
  )

  useEffect(() => {
    if (open) {
      const d = getDefaultDates(prefill)
      setStartDate(d.startDate)
      setEndDate(d.endDate)
      setReelsTarget(String(prefill?.reelsTarget ?? 6))
      setPostersTarget(String(prefill?.postersTarget ?? 7))
    }
  }, [open, prefill])

  const isRenewal = Boolean(prefill?.id) && !isEditing
  const title = isEditing
    ? "Edit Service Cycle"
    : isRenewal
      ? "Create Next Cycle"
      : "New Service Cycle"
  const description = isEditing
    ? "Update the contract period and deliverables. The content plan will be regenerated."
    : isRenewal
      ? "Start a new service cycle. Dates and deliverables can be modified from the previous cycle."
      : "Define the contract period and deliverables for this cycle."

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!startDate || !endDate) {
      toast({
        title: "Start and end dates are required",
        variant: "destructive",
      })
      return
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast({
        title: "End date must be after start date",
        variant: "destructive",
      })
      return
    }

    const reels = parseInt(reelsTarget, 10)
    const posters = parseInt(postersTarget, 10)

    if (isNaN(reels) || reels < 0 || isNaN(posters) || posters < 0) {
      toast({
        title: "Targets must be non-negative numbers",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      await onSubmit({
        clientId,
        startDate,
        endDate,
        reelsTarget: reels,
        postersTarget: posters,
      })
      onOpenChange(false)
      toast({
        title: isRenewal ? "Next cycle created" : "Service cycle created",
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save cycle"
      toast({ title: message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#161616] border-[rgba(255,255,255,0.08)] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-[#71717a]">
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 bg-[#1a1a1a] border-[rgba(255,255,255,0.08)] text-[13px] text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 bg-[#1a1a1a] border-[rgba(255,255,255,0.08)] text-[13px] text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">
                Reels Target
              </label>
              <Input
                type="number"
                min="0"
                value={reelsTarget}
                onChange={(e) => setReelsTarget(e.target.value)}
                className="h-9 bg-[#1a1a1a] border-[rgba(255,255,255,0.08)] text-[13px] text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">
                Posters Target
              </label>
              <Input
                type="number"
                min="0"
                value={postersTarget}
                onChange={(e) => setPostersTarget(e.target.value)}
                className="h-9 bg-[#1a1a1a] border-[rgba(255,255,255,0.08)] text-[13px] text-white"
              />
            </div>
          </div>

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
              {isSaving
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : isRenewal
                    ? "Create Cycle"
                    : "Create Cycle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
