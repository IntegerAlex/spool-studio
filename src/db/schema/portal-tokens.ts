import { sql } from "drizzle-orm"
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const portalTokens = pgTable("portal_tokens", {
  id: text("id").default(sql`(gen_random_uuid())::text`).primaryKey(),
  client_id: uuid("client_id").notNull(),
  token: text("token").notNull().unique(),
  expires_at: timestamp("expires_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  created_by: uuid("created_by"),
})

export type PortalToken = typeof portalTokens.$inferSelect
export type NewPortalToken = typeof portalTokens.$inferInsert
