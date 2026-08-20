import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { userRoleEnum } from "./enums"

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  full_name: text("full_name"),
  role: userRoleEnum("role").notNull().default("designer"),
  avatar_url: text("avatar_url"),
  password_hash: text("password_hash"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
