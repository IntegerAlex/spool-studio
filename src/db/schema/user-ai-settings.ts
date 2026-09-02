import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { users } from "./users"

// One row per user storing their own AI provider + model + encrypted API key.
// The API key is never stored or transmitted in plaintext: it is encrypted
// with AES-256-GCM (see src/lib/chat/crypto) and only ever shown to the
// frontend as a masked preview (e.g. sk-...AbCd).
export const userAiSettings = pgTable("user_ai_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  provider: text("provider").notNull(), // "openai" | "anthropic"
  model: text("model").notNull(),
  // AES-256-GCM ciphertext (base64) of the API key.
  encrypted_api_key: text("encrypted_api_key").notNull(),
  // Base64 96-bit IV produced by AES-256-GCM.
  api_key_iv: text("api_key_iv").notNull(),
  // Base64 auth tag produced by AES-256-GCM; detects tampering.
  api_key_tag: text("api_key_tag").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type UserAiSettings = typeof userAiSettings.$inferSelect
export type NewUserAiSettings = typeof userAiSettings.$inferInsert
