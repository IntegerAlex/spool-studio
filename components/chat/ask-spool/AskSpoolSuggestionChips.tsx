"use client"

import { Sparkles } from "lucide-react"

const SUGGESTIONS = [
  "List my pending approvals",
  "What's on the calendar this week?",
  "Show my recent assets",
  "Give me a dashboard summary",
]

export function AskSpoolSuggestionChips({
  onPick,
}: {
  onPick: (text: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pt-1">
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[11px] text-[var(--color-text-secondary)] transition-colors hover:border-[rgba(16,185,129,0.4)] hover:text-[var(--color-text-primary)]"
        >
          <Sparkles className="mr-1 inline h-3 w-3 text-[var(--primary)]/70" />
          {s}
        </button>
      ))}
    </div>
  )
}
