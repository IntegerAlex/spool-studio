import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  instagram_handle: text("instagram_handle"),
  brand_color: text("brand_color"),
  monthly_reels_target: integer("monthly_reels_target").notNull().default(0),
  monthly_posts_target: integer("monthly_posts_target").notNull().default(0),
  monthly_goal: integer("monthly_goal").notNull().default(0),
  weekly_goal: integer("weekly_goal").notNull().default(0),
  weekly_poster_goal: integer("weekly_poster_goal").notNull().default(0),
  weekly_reel_goal: integer("weekly_reel_goal").notNull().default(0),
  contract_start_date: date("contract_start_date"),
  contract_end_date: date("contract_end_date"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  drive_folder_id: text("drive_folder_id"),
  drive_folder_url: text("drive_folder_url"),
})

export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert
