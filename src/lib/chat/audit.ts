import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

/**
 * Structured audit log for the chat harness. Records tool usage and any
 * rejected/suspicious attempt WITHOUT logging secrets, tokens, or full message
 * content. Payloads are kept minimal: ids, tool names, statuses, and short,
 * pre-sanitized reason codes.
 */

export type ChatAuditEventType =
  | "chat.input.blocked"
  | "chat.tool.allowed"
  | "chat.tool.denied"
  | "chat.tool.error"
  | "chat.response.complete"

export interface ChatAuditEvent {
  type: ChatAuditEventType
  userId: string
  /** Stable reason code (e.g. "instruction-override"), never raw text. */
  reason?: string
  toolName?: string
  /** coarse outcome only — no payload contents */
  status?: string
}

export function logChatAudit(event: ChatAuditEvent): void {
  if (process.env.NODE_ENV === "test") return
  try {
    // Surface through the app's production error/diagnostics path with a
    // stable source tag so it lands in structured logs, not console spam.
    logProductionRuntimeError("chat-audit", {
      ...event,
      // explicitly no message text, no tokens, no cookies
    })
  } catch {
    // Audit logging must never break the chat flow.
  }
}
