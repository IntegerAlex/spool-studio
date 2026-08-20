import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { commentTypeEnum, revisionStatusEnum } from "./enums"

export const assetComments = pgTable("asset_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  asset_id: uuid("asset_id").notNull(),
  user_id: uuid("user_id").notNull(),
  type: commentTypeEnum("type").notNull().default("comment"),
  message: text("message").notNull(),
  revision_status: revisionStatusEnum("revision_status"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type AssetComment = typeof assetComments.$inferSelect
export type NewAssetComment = typeof assetComments.$inferInsert
