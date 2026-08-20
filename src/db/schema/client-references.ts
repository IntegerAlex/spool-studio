import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { clientReferenceTypeEnum } from "./enums"

export const clientReferences = pgTable("client_references", {
  id: uuid("id").defaultRandom().primaryKey(),
  client_id: uuid("client_id").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  type: clientReferenceTypeEnum("type").notNull().default("other"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type ClientReference = typeof clientReferences.$inferSelect
export type NewClientReference = typeof clientReferences.$inferInsert
