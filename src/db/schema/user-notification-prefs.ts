import { boolean, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"

export const userNotificationPrefs = pgTable("user_notification_prefs", {
  user_id: uuid("user_id").primaryKey(),
  email_on_asset_uploaded: boolean("email_on_asset_uploaded")
    .notNull()
    .default(true),
  email_on_revision_requested: boolean("email_on_revision_requested")
    .notNull()
    .default(true),
  email_on_comment_added: boolean("email_on_comment_added")
    .notNull()
    .default(true),
  email_on_approval_decision: boolean("email_on_approval_decision")
    .notNull()
    .default(true),
  push_enabled: boolean("push_enabled").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type UserNotificationPref = typeof userNotificationPrefs.$inferSelect
export type NewUserNotificationPref = typeof userNotificationPrefs.$inferInsert
