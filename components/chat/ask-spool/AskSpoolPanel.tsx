"use client"

import { ArrowUpRight, Loader2, Lock, MessageSquarePlus, Sparkles, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { useQuery } from "@tanstack/react-query"
import { DefaultChatTransport, type UIMessage } from "ai"
import { AskSpoolDisclaimer } from "./AskSpoolDisclaimer"
import { AskSpoolInput } from "./AskSpoolInput"
import { AskSpoolMessage } from "./AskSpoolMessage"
import { AskSpoolSuggestionChips } from "./AskSpoolSuggestionChips"
import { aiSettingsApi } from "@/lib/ai-settings-api"
import { useChatStore } from "@/stores/chat-store"

const GREETING =
  "Hi, I'm Spool AI. I can check approvals, find assets, summarise the schedule and more — ask me anything about your workflow."

export function AskSpoolPanel() {
  const { open, setOpen, resetThread } = useChatStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")

  const { data: aiSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: aiSettingsApi.get,
    staleTime: 30_000,
  })

  // Stable transport instance (recreating it would reset the chat).
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), [])

  const { messages, status, error, setMessages, sendMessage } = useChat({
    transport,
    id: "ask-spool",
  })

  const streaming = status === "submitted" || status === "streaming"
  const started = messages.length > 0

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streaming])

  if (!open) return null

  const configured = aiSettings?.configured === true
  const notConfigured = !settingsLoading && aiSettings && !configured

  const onSend = () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput("")
    void sendMessage({ text })
  }

  const onNewChat = () => {
    resetThread()
    setMessages([])
    setInput("")
  }

  return (
    <div
      className="fixed bottom-[76px] right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[var(--surface-elevated)] shadow-2xl"
      style={{ maxHeight: "calc(100vh - 6rem)" }}
      role="dialog"
      aria-label="Ask Spool AI assistant"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.07)] px-3 py-2.5">
        <Sparkles className="h-4 w-4 text-[var(--primary)]" />
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">Ask Spool</span>
        <span className="rounded bg-[var(--primary)]/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-[var(--primary)]">
          Beta
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onNewChat}
          aria-label="New chat"
          title="New chat"
          className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--color-text-primary)]"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--color-text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {notConfigured ? (
          <div className="space-y-3 py-2 text-center">
            <Lock className="mx-auto h-6 w-6 text-[var(--color-text-faint)]" />
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              AI isn&apos;t configured yet. Connect your own provider key to enable Ask Spool.
            </p>
            <Link
              href="/dashboard/ai"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] hover:brightness-110"
            >
              Set up AI <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : !started ? (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-[var(--color-text-primary)]">{GREETING}</p>
            <AskSpoolSuggestionChips onPick={setInput} />
          </div>
        ) : (
          <>
            {messages.map((m) => {
              if (m.role !== "user" && m.role !== "assistant") return null
              const rendered = summarizeMessage(m)
              return (
                <AskSpoolMessage key={m.id} role={m.role}>
                  {rendered.text.length > 0 ? (
                    <div className="whitespace-pre-wrap">{rendered.text}</div>
                  ) : null}
                  {rendered.tools > 0 && m.role === "assistant" ? (
                    <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-[rgba(16,185,129,0.1)] px-1.5 py-0.5 text-[10px] text-emerald-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {streaming ? "Working…" : `Checked ${rendered.tools} ${rendered.tools === 1 ? "item" : "items"}`}
                    </div>
                  ) : null}
                </AskSpoolMessage>
              )
            })}

            {error ? (
              <div className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-[var(--surface-card)] px-3 py-2 text-[12px] text-[var(--color-text-muted)]">
                {error.message.toLowerCase().includes("access")
                  ? "You don't have access to do that — this request can't be completed."
                  : error.message}
              </div>
            ) : null}
          </>
        )}
      </div>

      <AskSpoolDisclaimer />

      {!notConfigured ? (
        <div className="border-t border-[rgba(255,255,255,0.07)]">
          <AskSpoolInput
            value={input}
            onChange={setInput}
            onSubmit={onSend}
            disabled={streaming}
            streaming={streaming}
          />
        </div>
      ) : null}
    </div>
  )
}

interface MessageSummary {
  text: string
  tools: number
}

function summarizeMessage(m: UIMessage): MessageSummary {
  let text = ""
  let tools = 0
  for (const part of m.parts) {
    if (part.type === "text") {
      text += part.text
    } else if (part.type === "dynamic-tool" || part.type.startsWith("tool")) {
      tools += 1
    }
  }
  return { text, tools }
}
