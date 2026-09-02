import { z } from "zod"
import {
  decryptApiKey,
  encryptApiKey,
  getEncryptionKey,
  maskApiKey,
} from "@/lib/chat/crypto"
import {
  deleteUserAiSettings as repoDelete,
  getUserAiSettings as repoGet,
  type AiProvider,
  upsertUserAiSettings as repoUpsert,
} from "@/repositories/user-ai-settings-repository"

export const aiProviderSchema = z.enum(["openai", "anthropic"])

// Zod schema reused by the API route for validation.
export const saveAiSettingsSchema = z.object({
  provider: aiProviderSchema,
  model: z.string().trim().min(1).max(120),
  apiKey: z.string().trim().min(1).max(500),
})

export type SaveAiSettingsInput = z.infer<typeof saveAiSettingsSchema>

// The full decrypted settings used only on the server (chat route). Never
// serialized to the client.
export interface DecryptedAiSettings {
  provider: AiProvider
  model: string
  apiKey: string
}

// The safe shape returned to the client. The API key is only ever masked.
export interface MaskedAiSettings {
  configured: boolean
  provider: AiProvider | null
  model: string | null
  maskedApiKey: string | null
}

function encryptionSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET is not configured")
  getEncryptionKey(secret) // throws early if too short
  return secret
}

/**
 * Save a user's AI provider config. The API key is encrypted at rest with a
 * fresh IV; re-saving overwrites the previous config (key rotation).
 */
export async function saveAiSettings(
  userId: string,
  input: SaveAiSettingsInput,
): Promise<void> {
  const secret = encryptionSecret()
  const blob = encryptApiKey(input.apiKey, secret)
  await repoUpsert(userId, {
    provider: input.provider,
    model: input.model,
    encryptedApiKey: blob.ciphertext,
    apiKeyIv: blob.iv,
    apiKeyTag: blob.tag,
  })
}

/** Decrypt a user's stored config for server-side use. Never expose this. */
export async function getDecryptedAiSettings(
  userId: string,
): Promise<DecryptedAiSettings | null> {
  const row = await repoGet(userId)
  if (!row) return null
  const secret = encryptionSecret()
  let apiKey: string
  try {
    apiKey = decryptApiKey(
      {
        ciphertext: row.encrypted_api_key,
        iv: row.api_key_iv,
        tag: row.api_key_tag,
      },
      secret,
    )
  } catch {
    // Corrupt/tampered blob: treat as unconfigured rather than crashing. The
    // row stays so the user can overwrite it from the UI.
    return null
  }
  return {
    // SAFETY: provider column is constrained to AiProvider values at write time
    // (repository upsert takes an AiProvider); reading it back is identical.
    provider: row.provider as AiProvider,
    model: row.model,
    apiKey,
  }
}

/** Read-only config safe to return to the requesting user. */
export async function getMaskedAiSettings(
  userId: string,
): Promise<MaskedAiSettings> {
  const decrypted = await getDecryptedAiSettings(userId)
  if (!decrypted) {
    return { configured: false, provider: null, model: null, maskedApiKey: null }
  }
  return {
    configured: true,
    provider: decrypted.provider,
    model: decrypted.model,
    maskedApiKey: maskApiKey(decrypted.apiKey),
  }
}

export async function deleteAiSettings(userId: string): Promise<boolean> {
  return repoDelete(userId)
}
