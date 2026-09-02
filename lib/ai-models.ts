/**
 * Curated model catalogue shown in the AI settings UI. Users pick from this
 * list — the chat backend never trusts an arbitrary model string from input.
 *
 * Model IDs follow the Vercel AI Gateway convention: `provider/model`.
 * The gateway routes to the correct provider based on this prefix.
 */

export interface ModelOption {
  id: string
  label: string
  description: string
}

export interface ProviderGroup {
  label: string
  models: ModelOption[]
}

export const PROVIDER_GROUPS: ProviderGroup[] = [
  {
    label: "OpenAI",
    models: [
      { id: "openai/gpt-5", label: "GPT-5", description: "Latest flagship reasoning model" },
      { id: "openai/gpt-5-mini", label: "GPT-5 Mini", description: "Fast GPT-5 variant" },
      { id: "openai/gpt-5-nano", label: "GPT-5 Nano", description: "Lightweight, ultra-fast" },
      { id: "openai/gpt-4.1", label: "GPT-4.1", description: "Strong tool-use and instruction following" },
      { id: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini", description: "Fast, cost-efficient" },
      { id: "openai/gpt-4.1-nano", label: "GPT-4.1 Nano", description: "Ultra-light, lowest cost" },
      { id: "openai/gpt-4o", label: "GPT-4o", description: "Balanced multimodal flagship" },
      { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", description: "Fast, low cost" },
      { id: "openai/o4-mini", label: "o4-mini", description: "Affordable reasoning model" },
      { id: "openai/o3", label: "o3", description: "Advanced reasoning" },
      { id: "openai/o3-mini", label: "o3-mini", description: "Fast reasoning" },
      { id: "openai/o1", label: "o1", description: "Deep reasoning" },
    ],
  },
  {
    label: "Anthropic",
    models: [
      { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5", description: "Balanced performance and speed" },
      { id: "anthropic/claude-opus-4", label: "Claude Opus 4", description: "Most capable, complex tasks" },
      { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5", description: "Fast, low cost" },
      { id: "anthropic/claude-3-haiku", label: "Claude 3 Haiku", description: "Legacy fast model" },
    ],
  },
  {
    label: "Google",
    models: [
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Advanced reasoning, large context" },
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Fast, cost-efficient" },
      { id: "google/gemini-3-flash", label: "Gemini 3 Flash", description: "Latest fast model" },
      { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash", description: "Even faster" },
    ],
  },
  {
    label: "Meta",
    models: [
      { id: "meta/llama-4-maverick", label: "Llama 4 Maverick", description: "Latest Llama flagship" },
      { id: "meta/llama-4-scout", label: "Llama 4 Scout", description: "Efficient Llama 4" },
      { id: "meta/llama-3.3-70b", label: "Llama 3.3 70B", description: "Strong open-source model" },
      { id: "meta/llama-3.1-70b", label: "Llama 3.1 70B", description: "Proven open-source" },
    ],
  },
  {
    label: "Mistral",
    models: [
      { id: "mistral/mistral-large-3", label: "Mistral Large 3", description: "Most capable Mistral" },
      { id: "mistral/mistral-medium", label: "Mistral Medium", description: "Balanced performance" },
      { id: "mistral/mistral-small", label: "Mistral Small", description: "Fast, lightweight" },
      { id: "mistral/codestral", label: "Codestral", description: "Code generation specialist" },
    ],
  },
  {
    label: "DeepSeek",
    models: [
      { id: "deepseek/deepseek-r1", label: "DeepSeek R1", description: "Strong reasoning model" },
      { id: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2", description: "Latest general model" },
      { id: "deepseek/deepseek-v3", label: "DeepSeek V3", description: "General purpose" },
    ],
  },
  {
    label: "xAI",
    models: [
      { id: "spacexai/grok-4.6", label: "Grok 4.6", description: "Latest Grok model" },
      { id: "spacexai/grok-4.5", label: "Grok 4.5", description: "Strong reasoning" },
      { id: "spacexai/grok-4.3", label: "Grok 4.3", description: "Fast Grok" },
    ],
  },
  {
    label: "Perplexity",
    models: [
      { id: "perplexity/sonar", label: "Sonar", description: "Fast, web-grounded" },
      { id: "perplexity/sonar-pro", label: "Sonar Pro", description: "Deeper research" },
      { id: "perplexity/sonar-reasoning-pro", label: "Sonar Reasoning Pro", description: "Reasoning + web search" },
    ],
  },
  {
    label: "Alibaba",
    models: [
      { id: "alibaba/qwen3-coder", label: "Qwen3 Coder", description: "Code specialist" },
      { id: "alibaba/qwen3-max", label: "Qwen3 Max", description: "Most capable Qwen" },
      { id: "alibaba/qwen3.5-flash", label: "Qwen3.5 Flash", description: "Fast, cost-efficient" },
    ],
  },
  {
    label: "Cohere",
    models: [
      { id: "cohere/command-a", label: "Command A", description: "Enterprise-grade RAG" },
    ],
  },
]

/**
 * Legacy flat map keyed by provider slug (used by the AI settings page).
 * Each entry now uses gateway-style model IDs (provider/model).
 */
export const PROVIDER_MODELS: Record<string, ModelOption[]> =
  Object.fromEntries(PROVIDER_GROUPS.map((g) => [g.label.toLowerCase().replace(/\s+/g, "-"), g.models]))

export const ALL_MODEL_IDS: string[] = PROVIDER_GROUPS.flatMap((g) => g.models.map((m) => m.id))
