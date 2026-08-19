"use client"

import { Check, ChevronDown, SlidersHorizontal } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { CalendarEventKind } from "@/types/calendar"

export interface CalendarClientOption {
  id: string
  name: string
  brandColor?: string
}

interface CalendarFiltersProps {
  clients: CalendarClientOption[]
  selectedClientIds: string[]
  onSelectedClientIdsChange: (ids: string[]) => void
  enabledKinds: CalendarEventKind[]
  onEnabledKindsChange: (kinds: CalendarEventKind[]) => void
  includeDrafts: boolean
  onIncludeDraftsChange: (value: boolean) => void
}

const ALL_KINDS: CalendarEventKind[] = [
  "publish",
  "upload",
  "contract",
  "approval",
]

const KIND_LABEL: Record<CalendarEventKind, string> = {
  publish: "Publishes",
  upload: "Uploads",
  contract: "Contracts",
  approval: "Approvals",
}

export function CalendarFilters({
  clients,
  selectedClientIds,
  onSelectedClientIdsChange,
  enabledKinds,
  onEnabledKindsChange,
  includeDrafts,
  onIncludeDraftsChange,
}: CalendarFiltersProps) {
  const [clientOpen, setClientOpen] = useState(false)

  const toggleKind = (kind: CalendarEventKind) => {
    if (enabledKinds.includes(kind)) {
      onEnabledKindsChange(enabledKinds.filter((k) => k !== kind))
    } else {
      onEnabledKindsChange([...enabledKinds, kind])
    }
  }

  const toggleClient = (id: string) => {
    if (selectedClientIds.includes(id)) {
      onSelectedClientIdsChange(selectedClientIds.filter((c) => c !== id))
    } else {
      onSelectedClientIdsChange([...selectedClientIds, id])
    }
  }

  const activeClientCount = selectedClientIds.length

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-md border border-white/10 bg-[#161616] p-0.5">
        {ALL_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => toggleKind(kind)}
            className={cn(
              "h-7 rounded-[5px] px-3 text-[11px] font-medium transition-all",
              enabledKinds.includes(kind)
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {KIND_LABEL[kind]}
          </button>
        ))}
      </div>

      <Popover open={clientOpen} onOpenChange={setClientOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs border-white/10 bg-transparent text-zinc-300 hover:bg-white/5"
          >
            Clients{activeClientCount > 0 ? ` (${activeClientCount})` : ""}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-64 bg-[#161616] border-white/10 text-zinc-200 p-2"
        >
          <div className="max-h-64 overflow-y-auto space-y-1">
            {clients.length === 0 && (
              <p className="text-[11px] text-zinc-500 px-2 py-1">No clients</p>
            )}
            {clients.map((client) => {
              const checked = selectedClientIds.includes(client.id)
              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => toggleClient(client.id)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[12px] hover:bg-white/5"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      checked ? "border-white bg-white/20" : "border-white/30",
                    )}
                  >
                    {checked && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: client.brandColor || "#52525b" }}
                  />
                  <span className="truncate">{client.name}</span>
                </button>
              )
            })}
          </div>
          {activeClientCount > 0 && (
            <button
              type="button"
              onClick={() => onSelectedClientIdsChange([])}
              className="mt-2 w-full rounded border border-white/10 px-2 py-1 text-[11px] text-zinc-400 hover:bg-white/5"
            >
              Clear clients
            </button>
          )}
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={() => onIncludeDraftsChange(!includeDrafts)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[11px] font-medium transition-colors",
          includeDrafts
            ? "border-white/20 bg-white/10 text-white"
            : "border-white/10 bg-transparent text-zinc-500 hover:text-zinc-300",
        )}
        title="Include draft/design assets in the timeline"
      >
        <SlidersHorizontal className="h-3 w-3" />
        Drafts
      </button>
    </div>
  )
}
