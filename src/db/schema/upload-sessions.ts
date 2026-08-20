import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const uploadSessions = pgTable("upload_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  asset_id: uuid("asset_id"),
  user_id: uuid("user_id"),
  r2_key: text("r2_key").notNull(),
  file_name: text("file_name").notNull(),
  mime_type: text("mime_type"),
  file_size: integer("file_size").default(0),
  status: text("status").notNull().default("pending"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type UploadSession = typeof uploadSessions.$inferSelect
export type NewUploadSession = typeof uploadSessions.$inferInsert
