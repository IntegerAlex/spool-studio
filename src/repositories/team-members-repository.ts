import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import { teamMembers } from "@/db/schema"

export type DbTeamMember = typeof teamMembers.$inferSelect

export async function listTeamMembersByWorkspaceId(
  workspaceId: string,
): Promise<DbTeamMember[]> {
  return db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.workspace_id, workspaceId))
}

export async function listTeamMembersByUserId(
  userId: string,
): Promise<DbTeamMember[]> {
  return db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.user_id, userId))
}

export async function getTeamMember(
  userId: string,
  workspaceId: string,
): Promise<DbTeamMember | null> {
  const rows = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.user_id, userId),
        eq(teamMembers.workspace_id, workspaceId),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

export async function insertTeamMember(
  payload: typeof teamMembers.$inferInsert,
): Promise<DbTeamMember> {
  const insertValues = payload
  const rows = await db
    .insert(teamMembers)
    .values(insertValues)
    .returning()
  return rows[0]
}

export async function deleteTeamMember(id: string): Promise<void> {
  await db.delete(teamMembers).where(eq(teamMembers.id, id))
}

export async function deleteTeamMembersByWorkspaceId(
  workspaceId: string,
): Promise<void> {
  await db.delete(teamMembers).where(eq(teamMembers.workspace_id, workspaceId))
}
