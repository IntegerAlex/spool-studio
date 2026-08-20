import { desc, eq } from "drizzle-orm"
import { db, type FlexibleInsert } from "@/db"
import { workspaces } from "@/db/schema"

export type DbWorkspace = typeof workspaces.$inferSelect

export async function listWorkspaces(): Promise<DbWorkspace[]> {
  return db
    .select()
    .from(workspaces)
    .orderBy(desc(workspaces.created_at))
}

export async function getWorkspaceById(
  id: string,
): Promise<DbWorkspace | null> {
  const rows = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function getFirstWorkspace(): Promise<DbWorkspace | null> {
  const rows = await db
    .select()
    .from(workspaces)
    .limit(1)
  return rows[0] ?? null
}

export async function insertWorkspace(
  payload: FlexibleInsert<typeof workspaces.$inferInsert>,
): Promise<DbWorkspace> {
  // SAFETY: payload is FlexibleInsert<$inferInsert>; values are valid for DB insert.
  const insertValues = payload as typeof workspaces.$inferInsert
  const rows = await db
    .insert(workspaces)
    .values(insertValues)
    .returning()
  return rows[0]
}

export async function updateWorkspace(
  id: string,
  updates: Partial<FlexibleInsert<typeof workspaces.$inferInsert>>,
): Promise<DbWorkspace> {
  // SAFETY: updates is Partial<FlexibleInsert<$inferInsert>>; values valid for DB update.
  const setValues = updates as Partial<typeof workspaces.$inferInsert>
  const rows = await db
    .update(workspaces)
    .set(setValues)
    .where(eq(workspaces.id, id))
    .returning()
  return rows[0]
}

export async function deleteWorkspace(id: string): Promise<void> {
  await db.delete(workspaces).where(eq(workspaces.id, id))
}
