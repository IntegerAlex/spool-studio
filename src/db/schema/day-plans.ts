import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { assetTypeEnum } from "./enums"

export const dayPlans = pgTable("day_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: text("date").notNull(),
  designer_id: uuid("designer_id").notNull(),
  client_id: uuid("client_id").notNull(),
  cycle_id: uuid("cycle_id"),
  kind: assetTypeEnum("kind").notNull(),
  qty: integer("qty").notNull().default(1),
  done_qty: integer("done_qty").notNull().default(0),
  status: text("status").notNull().default("pending"),
  reference_ids: uuid("reference_ids").array().notNull().default([]),
  result_asset_id: uuid("result_asset_id"),
  created_by: uuid("created_by"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type DayPlan = typeof dayPlans.$inferSelect
export type NewDayPlan = typeof dayPlans.$inferInsert
