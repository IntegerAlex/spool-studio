import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const assetRevisions = pgTable("asset_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  asset_id: uuid("asset_id").notNull(),
  version_number: integer("version_number").notNull(),
  uploaded_by: uuid("uploaded_by"),
  uploaded_at: timestamp("uploaded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  drive_file_id: text("drive_file_id").notNull(),
  drive_file_url: text("drive_file_url"),
  file_size: integer("file_size"),
  mime_type: text("mime_type"),
  media_width: integer("media_width"),
  media_height: integer("media_height"),
  duration_seconds: doublePrecision("duration_seconds"),
  change_note: text("change_note"),
  metadata: jsonb("metadata").default("{}"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type AssetRevision = typeof assetRevisions.$inferSelect
export type NewAssetRevision = typeof assetRevisions.$inferInsert
