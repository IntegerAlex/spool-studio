import { streamText } from "ai"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { ApiError, jsonError } from "@/lib/api-error"
import { requireUser } from "@/lib/auth"
import { SESSION_COOKIE_NAME } from "@/lib/auth/session"
import { logChatAudit } from "@/lib/chat/audit"
import { AccessDeniedError } from "@/lib/chat/internal-api"
import { createChatModel, type ModelConfig } from "@/lib/chat/provider"
import { DENIAL_MESSAGE, guardUserInput, gateTool } from "@/lib/chat/guardrails"
import { buildSystemPrompt } from "@/lib/chat/system-prompt"
import { buildToolSet } from "@/lib/chat/tools"
import { toCookieHeader } from "@/lib/chat/tools/context"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getDecryptedAiSettings } from "@/services/user-ai-settings-service"

export const runtime = "nodejs"
// Chat is inherently long-running (model + multi-tool calls).
export const maxDuration = 60

const partSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
})

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().nullable().optional(),
  parts: z.array(partSchema).optional(),
})

const chatRequestBodySchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
})

// The AI SDK v4 transport sends UIMessage objects whose text lives in parts[]
// (type "text"). Classic clients send a plain `content` string. Accept both.
function messageText(m: z.infer<typeof chatMessageSchema>): string {
  if (m.content != null && m.content.length > 0) return m.content
  if (m.parts) {
    let out = ""
    for (const part of m.parts) {
      if (part.type === "text" && part.text != null) out += part.text
    }
    return out
  }
  return ""
}

export async function POST(request: Request) {
  let auditUserId: string | null = null
  try {
    const user = await requireUser()
    auditUserId = user.id

    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
    if (!sessionToken) {
      throw ApiError.unauthorized()
    }

    // Parse + validate the request at the boundary; nothing here trusts a
    // stringly/unknown body beyond what the schema guarantees.
    const parsedBody = chatRequestBodySchema.safeParse(await request.json())
    if (!parsedBody.success) {
      throw ApiError.badRequest("messages[] with valid roles is required")
    }
    const messages = parsedBody.data.messages

    const lastUser = [...messages].reverse().find((m) => m.role === "user")
    if (!lastUser) {
      throw ApiError.badRequest("A user message is required")
    }
    // Lightweight injection pre-filter before anything reaches the model.
    const verdict = guardUserInput(messageText(lastUser))
    if (verdict) {
      logChatAudit({ type: "chat.input.blocked", userId: user.id, reason: verdict.reason })
      return NextResponse.json(
        { success: false as const, error: "I can't process that request. Please try rephrasing." },
        { status: 400 },
      )
    }

    // Resolve the model from the requesting user's OWN settings (encrypted at
    // rest). Fall back to env defaults only if none configured.
    const userSettings = await getDecryptedAiSettings(user.id)
    let providerConfig: ModelConfig
    if (userSettings && userSettings.apiKey) {
      providerConfig = userSettings
    } else {
      const envProvider = process.env.AI_PROVIDER
      const isAnthropic = envProvider === "anthropic"
      const apiKey = isAnthropic
        ? process.env.ANTHROPIC_API_KEY
        : process.env.OPENAI_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          {
            success: false as const,
            error:
              "AI isn't configured yet. Go to Settings → AI to connect your own provider key.",
          },
          { status: 400 },
        )
      }
      providerConfig = {
        provider: isAnthropic ? "anthropic" : "openai",
        model:
          process.env.AI_MODEL ??
          (isAnthropic ? "claude-sonnet-4-5" : "gpt-4o"),
        apiKey,
      }
    }

    const cookieHeader = toCookieHeader(sessionToken)
    const ctx = {
      user: { id: user.id, email: user.email, role: user.role },
      cookieHeader,
    }
    const tools = buildToolSet(ctx)

    // Safety net: every tool executed is role-gated (buildToolSet already
    // filters; this records any residual mismatch for audit).
    for (const name of Object.keys(tools)) {
      const gate = gateTool(name, user.role)
      if (!gate.allowed) {
        logChatAudit({
          type: "chat.tool.denied",
          userId: user.id,
          toolName: name,
          reason: gate.reason,
        })
      }
    }

    const system = buildSystemPrompt(user.role, user.name ?? user.email)

    const stream = streamText({
      model: createChatModel(providerConfig),
      system,
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: messageText(m) })),
      tools,
      // Anthropic prompt caching: tag the stable prefix (system + tools) as
      // cacheable so repeated turns reuse cached tokens. OpenAI caches
      // automatically on stable prefixes. Confirm cache hits via the provider's
      // response metadata on turn 2+.
      providerOptions:
        providerConfig.provider === "anthropic"
          ? { anthropic: { cacheControl: { type: "ephemeral" } } }
          : undefined,
      onFinish: () => {
        logChatAudit({ type: "chat.response.complete", userId: user.id })
      },
    })
    return stream.toUIMessageStreamResponse()
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      logChatAudit({
        type: "chat.tool.denied",
        userId: auditUserId ?? "unknown",
        status: "403",
      })
      // Calm, generic denial — never reveal why or whose data was involved.
      return NextResponse.json(
        { success: false as const, error: DENIAL_MESSAGE },
        { status: 403 },
      )
    }
    logProductionRuntimeError("api-chat", error)
    return jsonError(error)
  }
}
