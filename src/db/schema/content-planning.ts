import {
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { assetTypeEnum } from "./enums"

export const cycleStatusEnum = pgEnum("cycle_status", [
  "upcoming",
  "active",
  "completed",
  "cancelled",
])

export const serviceCycles = pgTable("service_cycles", {
  id: uuid("id").defaultRandom().primaryKey(),
  client_id: uuid("client_id").notNull(),
  start_date: date("start_date").notNull(),
  end_date: date("end_date").notNull(),
  reels_target: integer("reels_target").notNull().default(0),
  posters_target: integer("posters_target").notNull().default(0),
  status: cycleStatusEnum("status").notNull().default("upcoming"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const contentPlans = pgTable(
  "content_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cycle_id: uuid("cycle_id").notNull(),
    client_id: uuid("client_id").notNull(),
    week_number: integer("week_number").notNull(),
    week_start: date("week_start").notNull(),
    week_end: date("week_end").notNull(),
    planned_reels: integer("planned_reels").notNull().default(0),
    planned_posters: integer("planned_posters").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueWeekPerCycle: uniqueIndex("unique_week_per_cycle").on(
      table.cycle_id,
      table.week_number,
    ),
  }),
)

export const serviceCycleSequences = pgTable(
  "service_cycle_sequences",
  {
    cycle_id: uuid("cycle_id").notNull(),
    asset_type: assetTypeEnum("asset_type").notNull(),
    next_number: integer("next_number").notNull().default(1),
  },
  (table) => ({
    pk: uniqueIndex("service_cycle_sequences_pkey").on(
      table.cycle_id,
      table.asset_type,
    ),
  }),
)

export const assetPublicationRecords = pgTable(
  "asset_publication_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    asset_id: uuid("asset_id").notNull(),
    client_id: uuid("client_id"),
    client_name: text("client_name"),
    title: text("title"),
    type: assetTypeEnum("type"),
    uploaded_at: timestamp("uploaded_at", { withTimezone: true }),
    approved_at: timestamp("approved_at", { withTimezone: true }),
    published_at: timestamp("published_at", { withTimezone: true }),
    publish_date: date("publish_date"),
    publish_time: time("publish_time"),
    created_at: timestamp("created_at", { withTimezone: true }),
    drive_file_url: text("drive_file_url"),
    assigned_to: uuid("assigned_to"),
    approved_by: uuid("approved_by"),
    revision_count: integer("revision_count"),
  },
  (table) => ({
    uniqueAsset: uniqueIndex("unique_asset_publication").on(table.asset_id),
  }),
)

export type ServiceCycle = typeof serviceCycles.$inferSelect
export type NewServiceCycle = typeof serviceCycles.$inferInsert
export type ContentPlan = typeof contentPlans.$inferSelect
export type NewContentPlan = typeof contentPlans.$inferInsert
export type ServiceCycleSequence = typeof serviceCycleSequences.$inferSelect
export type AssetPublicationRecord = typeof assetPublicationRecords.$inferSelect
