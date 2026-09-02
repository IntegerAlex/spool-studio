import type { AiProvider } from "@/repositories/user-ai-settings-repository"

/**
 * Curated model catalogue shown in the AI settings UI. Users pick from this
 * list — the chat backend never trusts an arbitrary model string from input.
 */
export interface ModelOption {
  id: string
  label: string
  description: string
}

export const PROVIDER_MODELS = {
  openai: [
    { id: "gpt-4o", label: "GPT-4o", description: "Balanced flagship" },
    { id: "gpt-4o-mini", label: "GPT-4o mini", description: "Fast, low cost" },
    { id: "gpt-4.1", label: "GPT-4.1", description: "Recent flagship (tool use)" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", description: "Balanced" },
    { id: "claude-opus-4-1", label: "Claude Opus 4.1", description: "Most capable" },
    { id: "claude-3-5-haiku-latest", label: "Claude Haiku", description: "Fast, low cost" },
  ],
} satisfies Record<AiProvider, ModelOption[]>
