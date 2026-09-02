import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import type { AiProvider } from "@/repositories/user-ai-settings-repository"

/**
 * Provider-agnostic model factory. The active provider + model + API key are
 * resolved from the requesting user's own encrypted settings (see
 * src/services/user-ai-settings-service) — not from a shared global key.
 */

export interface ModelConfig {
  provider: AiProvider
  model: string
  apiKey: string
}

export function createChatModel(config: ModelConfig) {
  const { provider, model, apiKey } = config
  if (!apiKey) {
    throw new Error("AI provider API key is required to start a chat session")
  }
  if (provider === "anthropic") {
    return createAnthropic({ apiKey })(model)
  }
  if (provider === "openai") {
    return createOpenAI({ apiKey })(model)
  }
  throw new Error(`Unsupported AI provider: ${String(provider)}`)
}

export type { AiProvider }
