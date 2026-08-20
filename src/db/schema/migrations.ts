import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const migrations = pgTable("_migrations", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  filename: text("filename").notNull().unique(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).defaultNow(),
})

export type Migration = typeof migrations.$inferSelect
export type NewMigration = typeof migrations.$inferInsert
