import type { AiProvider } from "@/repositories/user-ai-settings-repository"

/**
 * Client-side API for the requesting user's own AI provider config. Only the
 * requesting user's settings are ever touched (the server scopes by session).
 * The API key is never returned to the client — only masked.
 */

export interface MaskedAiSettings {
  configured: boolean
  provider: AiProvider | null
  model: string | null
  maskedApiKey: string | null
}

interface Envelope<T> {
  data?: T
  error?: string
}

export const aiSettingsApi = {
  get: async (): Promise<MaskedAiSettings> => {
    const res = await fetch("/api/user/ai-settings", {
      headers: { accept: "application/json" },
    })
    // SAFETY: responses are our own API envelope JSON; the cast only shapes the
    // parse result. Failure branches on res.ok/error handle non-envelope cases.
    const payload = (await res.json()) as Envelope<MaskedAiSettings>
    if (!res.ok || payload.error) {
      throw new Error(payload.error ?? "Failed to load AI settings")
    }
    return (
      payload.data ?? {
        configured: false,
        provider: null,
        model: null,
        maskedApiKey: null,
      }
    )
  },

  save: async (input: {
    provider: AiProvider
    model: string
    apiKey: string
  }): Promise<MaskedAiSettings> => {
    const res = await fetch("/api/user/ai-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(input),
    })
    // SAFETY: responses are our own API envelope JSON; the cast only shapes the
    // parse result. Failure branches on res.ok/error handle non-envelope cases.
    const payload = (await res.json()) as Envelope<MaskedAiSettings>
    if (!res.ok || payload.error) {
      throw new Error(payload.error ?? "Failed to save AI settings")
    }
    // SAFETY: the save endpoint returns the masked settings envelope.
    return payload.data as MaskedAiSettings
  },

  remove: async (): Promise<void> => {
    const res = await fetch("/api/user/ai-settings", { method: "DELETE" })
    // SAFETY: responses are our own API envelope JSON; only res.ok/error are read.
    const payload = (await res.json()) as Envelope<{ deleted: boolean }>
    if (!res.ok || payload.error) {
      throw new Error(payload.error ?? "Failed to remove AI settings")
    }
  },
}
