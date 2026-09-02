import { eq } from "drizzle-orm"
import { db } from "@/db"
import { userAiSettings } from "@/db/schema"

export type DbUserAiSettings = typeof userAiSettings.$inferSelect

export type AiProvider = "openai" | "anthropic"

export interface StoredAiSettings {
  provider: AiProvider
  model: string
  encryptedApiKey: string
  apiKeyIv: string
  apiKeyTag: string
}

export async function getUserAiSettings(
  userId: string,
): Promise<DbUserAiSettings | null> {
  const rows = await db
    .select()
    .from(userAiSettings)
    .where(eq(userAiSettings.user_id, userId))
    .limit(1)
  return rows[0] ?? null
}

export async function upsertUserAiSettings(
  userId: string,
  settings: {
    provider: string
    model: string
    encryptedApiKey: string
    apiKeyIv: string
    apiKeyTag: string
  },
): Promise<DbUserAiSettings> {
  const insertValues = {
    user_id: userId,
    provider: settings.provider,
    model: settings.model,
    encrypted_api_key: settings.encryptedApiKey,
    api_key_iv: settings.apiKeyIv,
    api_key_tag: settings.apiKeyTag,
  }
  const rows = await db
    .insert(userAiSettings)
    .values(insertValues)
    .onConflictDoUpdate({
      target: userAiSettings.user_id,
      set: {
        provider: settings.provider,
        model: settings.model,
        encrypted_api_key: settings.encryptedApiKey,
        api_key_iv: settings.apiKeyIv,
        api_key_tag: settings.apiKeyTag,
        updated_at: new Date(),
      },
    })
    .returning()
  return rows[0]
}

export async function deleteUserAiSettings(userId: string): Promise<boolean> {
  const rows = await db
    .delete(userAiSettings)
    .where(eq(userAiSettings.user_id, userId))
    .returning({ id: userAiSettings.id })
  return rows.length > 0
}
