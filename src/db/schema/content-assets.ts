import {
  date,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { assetStatusEnum, assetTypeEnum } from "./enums"

export const contentAssets = pgTable("content_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  client_id: uuid("client_id").notNull(),
  title: text("title").notNull(),
  type: assetTypeEnum("type").notNull(),
  status: assetStatusEnum("status").notNull().default("draft"),
  drive_file_url: text("drive_file_url"),
  drive_file_id: text("drive_file_id"),
  drive_folder_id: text("drive_folder_id"),
  drive_folder_url: text("drive_folder_url"),
  thumbnail_url: text("thumbnail_url"),
  assigned_to: uuid("assigned_to"),
  created_by: uuid("created_by").notNull(),
  scheduled_at: timestamp("scheduled_at", { withTimezone: true }),
  mime_type: text("mime_type"),
  file_size: integer("file_size"),
  file_extension: text("file_extension"),
  uploaded_at: timestamp("uploaded_at", { withTimezone: true }),
  uploaded_by: uuid("uploaded_by"),
  media_width: integer("media_width"),
  media_height: integer("media_height"),
  duration_seconds: doublePrecision("duration_seconds"),
  current_revision_id: uuid("current_revision_id"),
  latest_revision_id: uuid("latest_revision_id"),
  revision_count: integer("revision_count").notNull().default(0),
  publish_date: date("publish_date"),
  publish_time: time("publish_time"),
  scheduled_by: uuid("scheduled_by"),
  published_at: timestamp("published_at", { withTimezone: true }),
  approved_at: timestamp("approved_at", { withTimezone: true }),
  approved_by: uuid("approved_by"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  recurrence: jsonb("recurrence"),
  cycle_id: uuid("cycle_id"),
  asset_number: integer("asset_number"),
})

export type ContentAsset = typeof contentAssets.$inferSelect
export type NewContentAsset = typeof contentAssets.$inferInsert
