import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const assetActivityLogs = pgTable("asset_activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  asset_id: uuid("asset_id").notNull(),
  user_id: uuid("user_id"),
  action: text("action").notNull(),
  metadata: jsonb("metadata").default("{}"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type AssetActivityLog = typeof assetActivityLogs.$inferSelect
export type NewAssetActivityLog = typeof assetActivityLogs.$inferInsert
