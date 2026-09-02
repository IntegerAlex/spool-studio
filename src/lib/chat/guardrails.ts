import { getPermissionsForRole, type Permission } from "@/lib/rbac"

/**
 * Prompt-injection & jailbreak guardrails.
 *
 * Security model:
 *  1. ALL tool outputs / DB content / user content are treated as untrusted
 *     *data*, never instructions. The system prompt wraps every tool result in
 *     clearly delimited DATA blocks and instructs the model that the contents
 *     are data only.
 *  2. User input is pre-filtered for obvious injection/jailbreak patterns
 *     before it reaches the model.
 *  3. Only tools registered for the requesting user's role may execute; the
 *     model cannot invent tool names (execution is gated against the registry).
 *  4. Rejected/suspicious attempts are reported for a structured audit log
 *     (without logging secrets or tokens).
 */

export type GuardSeverity = "block" | "flag"

export interface GuardVerdict {
  severity: GuardSeverity
  /** Stable short reason code for audit logging. */
  reason: string
  message?: string
}

export const DATA_MARKER_START = "─── DATA START (tool) ───"
export const DATA_MARKER_END = "─── DATA END ───"

/**
 * Heuristic pre-filter for obvious jailbreak / injection attempts in a user
 * message. This is a lightweight defense-in-depth layer, not a substitute for
 * output validation and the data-block framing.
 */
const BLOCK_PATTERNS: { regex: RegExp; reason: string }[] = [
  {
    // Instruction-override attempts.
    regex: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
    reason: "instruction-override",
  },
  {
    regex: /disregard\s+(the\s+)?(system\s+)?(prompt|instructions?)/i,
    reason: "instruction-override",
  },
  { regex: /\byou\s+are\s+now\s+(openai|gpt|claude|an\s+ai|dan)\b/i, reason: "role-override" },
  { regex: /\bact\s+as\s+(openai|gpt|claude|dan|a\s+developer)\b/i, reason: "role-override" },
  {
    regex: /reveal|exfiltrate|print|show\s+me\s+your\s+(system\s+)?prompt/i,
    reason: "prompt-exfil",
  },
  { regex: /return\s+(the\s+)?(system\s+)?(prompt|instructions?)/i, reason: "prompt-exfil" },
  {
    regex: /tokens?\s+(of\s+)?(the\s+)?(other|another|a\s+different|user)s?/i,
    reason: "cross-user-probe",
  },
  {
    // Attempts to break out of delimited data blocks.
    regex: /(ignore|forget)\s+(the\s+)?(delimited|data|blocks?|markers?)/i,
    reason: "delimiter-escape",
  },
  { regex: /as\s+(the\s+)?system\b/i, reason: "role-override" },
]

/** Long opaque blobs (e.g. base64) inside a short user prompt are suspicious. */
function looksLikeEncodedPayload(text: string): boolean {
  const b64 = (text.match(/[A-Za-z0-9+/]{60,}={0,2}/g) ?? []).join("")
  return b64.length > 100
}

export function guardUserInput(text: string): GuardVerdict | null {
  const normalized = text.trim()
  if (normalized.length === 0) return { severity: "block", reason: "empty-input" }
  if (normalized.length > 2000) {
    return { severity: "block", reason: "input-too-long" }
  }
  for (const { regex, reason } of BLOCK_PATTERNS) {
    if (regex.test(normalized)) {
      return { severity: "block", reason }
    }
  }
  if (looksLikeEncodedPayload(normalized)) {
    return { severity: "block", reason: "encoded-payload" }
  }
  return null
}

/**
 * Map a tool name + the acting user's role to an allowed/denied verdict.
 * Unknown tool names are rejected before execution — the model can only call
 * tools whose required permission the role holds.
 */
const TOOL_PERMISSION_MAP = {
  get_dashboard_summary: ["assets:read"],
  get_assets: ["assets:read"],
  get_asset_detail: ["assets:read"],
  get_clients: ["clients:read"],
  get_client_detail: ["clients:read"],
  get_approvals: ["assets:read"],
  get_calendar: ["assets:read"],
  get_kanban_board: ["assets:read"],
  get_notifications: ["notifications:read"],
  add_comment: ["comments:create"],
  move_asset_status: ["assets:update"],
  approve_asset: ["assets:approve"],
  reject_asset: ["assets:approve"],
} as const satisfies Record<string, readonly Permission[]>

type ToolName = keyof typeof TOOL_PERMISSION_MAP

// SAFETY: Object.keys of a const object returns exactly its string keys, i.e.
// the ToolName union — this assertion is identity, not widening.
const toolNames = Object.keys(TOOL_PERMISSION_MAP) as ToolName[]

export const REGISTERED_TOOLS: readonly ToolName[] = toolNames

export interface ToolGateResult {
  allowed: boolean
  reason: "no-such-tool" | "permission-denied" | "ok"
}

export function gateTool(toolName: string, role: string): ToolGateResult {
  if (!(toolName in TOOL_PERMISSION_MAP)) {
    return { allowed: false, reason: "no-such-tool" }
  }
  // SAFETY: `toolName in TOOL_PERMISSION_MAP` above proves it is one of the
  // map's keys, so indexing by ToolName is valid.
  const required = TOOL_PERMISSION_MAP[toolName as ToolName]
  const granted = getPermissionsForRole(role)
  if (!required.every((perm) => granted.includes(perm))) {
    return { allowed: false, reason: "permission-denied" }
  }
  return { allowed: true, reason: "ok" }
}

/** Tools the model may invoke for a given role. */
export function allowedToolNames(role: string): string[] {
  return REGISTERED_TOOLS.filter((name) => gateTool(name, role).allowed)
}

export const DENIAL_MESSAGE = "You don't have access to do that — this request can't be completed."
