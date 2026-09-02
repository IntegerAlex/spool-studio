"use client"

import { Sparkles } from "lucide-react"
import { AskSpoolPanel } from "./AskSpoolPanel"
import { useChatStore } from "@/stores/chat-store"

/**
 * Floating "Ask Spool" launcher + anchored panel, mounted once in the dashboard
 * shell so it persists across route changes. Open/closed state lives in the
 * chat store (session-scoped, resets on logout).
 */
export function AskSpoolLauncher() {
  const { open, toggle } = useChatStore()

  return (
    <>
      <AskSpoolPanel />
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "Close Ask Spool" : "Open Ask Spool"}
        className="fixed bottom-4 right-4 z-[60] flex h-11 items-center gap-2 rounded-lg border border-transparent bg-[var(--color-primary)] pl-3.5 pr-1.5 text-[13px] font-semibold text-[var(--color-primary-foreground)] shadow-lg transition-[filter] hover:brightness-95"
      >
        <Sparkles className="h-4 w-4 text-[var(--color-primary-foreground)]" />
        <span>Ask Spool</span>
        <span className="rounded bg-black/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-[var(--color-primary-foreground)]">
          Beta
        </span>
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-black/10 text-[var(--color-primary-foreground)]">
          {open ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>
    </>
  )
}
