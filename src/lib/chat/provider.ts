import { createGateway } from "ai"
import type { AiProvider } from "@/repositories/user-ai-settings-repository"

/**
 * Provider-agnostic model factory. The active provider + model + API key are
 * resolved from the requesting user's own encrypted settings (see
 * src/services/user-ai-settings-service) — not from a shared global key.
 *
 * Uses the Vercel AI Gateway (ai-gateway.vercel.sh) which routes to every
 * major provider (OpenAI, Anthropic, Google, Meta, Mistral, Perplexity, etc.)
 * through a single unified endpoint. Model IDs follow the gateway convention:
 * `provider/model` (e.g. `openai/gpt-4o`, `anthropic/claude-sonnet-4.5`).
 */

export interface ModelConfig {
  provider: AiProvider
  model: string
  apiKey: string
}

export function createChatModel(config: ModelConfig) {
  const { model, apiKey } = config
  if (!apiKey) {
    throw new Error("AI provider API key is required to start a chat session")
  }
  // SAFETY: model is a validated gateway model ID string (provider/model format);
  // passing it to createGateway which accepts the full GatewayModelId union.
  const gateway = createGateway({ apiKey })
  return gateway.languageModel(model)
}

export type { AiProvider }
