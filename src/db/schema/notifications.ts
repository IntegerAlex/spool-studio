import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  related_asset_id: uuid("related_asset_id"),
  read: boolean("read").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
