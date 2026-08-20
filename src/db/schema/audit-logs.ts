import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id"),
  user_email: text("user_email"),
  user_name: text("user_name"),
  action: text("action").notNull(),
  entity_type: text("entity_type").notNull(),
  entity_id: uuid("entity_id"),
  entity_name: text("entity_name"),
  metadata: jsonb("metadata").default("{}"),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
