import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const teamMembers = pgTable("team_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").notNull(),
  workspace_id: uuid("workspace_id").notNull(),
  role: text("role").notNull().default("member"),
  joined_at: timestamp("joined_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type TeamMember = typeof teamMembers.$inferSelect
export type NewTeamMember = typeof teamMembers.$inferInsert
