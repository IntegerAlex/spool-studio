"use client"

import { Loader2, SendHorizonal } from "lucide-react"
import { cn } from "@/lib/utils"

interface AskSpoolInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
  streaming: boolean
}

export function AskSpoolInput({
  value,
  onChange,
  onSubmit,
  disabled,
  streaming,
}: AskSpoolInputProps) {
  const canSend = !disabled && value.trim().length > 0

  return (
    <form
      className="flex items-center gap-2 px-3 py-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSend) onSubmit()
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask about clients, assets, or schedule…"
        aria-label="Chat message"
        className="h-9 flex-1 rounded-full border border-[rgba(255,255,255,0.1)] bg-[var(--surface-input)] px-3.5 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-faint)] outline-none focus:border-[rgba(16,185,129,0.5)]"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send"
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
          canSend
            ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-110"
            : "bg-[var(--surface-elevated)] text-[var(--color-text-faint)]",
        )}
      >
        {streaming ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <SendHorizonal className="h-4 w-4" />
        )}
      </button>
    </form>
  )
}
