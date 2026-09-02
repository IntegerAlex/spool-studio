"use client"

import { create } from "zustand"

interface ChatState {
  /** Whether the Ask Spool panel is open (collapsed launcher otherwise). */
  open: boolean
  /** Monotonic id bumped to start a fresh thread. */
  threadId: number
  toggle: () => void
  setOpen: (open: boolean) => void
  resetThread: () => void
}

// Intentionally NOT persisted: the panel state lives for the current logged-in
// session only and resets to closed on logout / page load.
export const useChatStore = create<ChatState>((set) => ({
  open: false,
  threadId: 0,
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
  resetThread: () => set((s) => ({ threadId: s.threadId + 1 })),
}))
