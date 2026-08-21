import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { clientReferences } from "@/db/schema"

export type DbClientReference = typeof clientReferences.$inferSelect

export async function listClientReferencesByClientId(
  clientId: string,
): Promise<DbClientReference[]> {
  const rows = await db
    .select()
    .from(clientReferences)
    .where(eq(clientReferences.client_id, clientId))
    .orderBy(desc(clientReferences.created_at))
  return rows
}

export async function getClientReferenceById(
  referenceId: string,
): Promise<DbClientReference | null> {
  const rows = await db
    .select()
    .from(clientReferences)
    .where(eq(clientReferences.id, referenceId))
    .limit(1)
  return rows[0] ?? null
}

export async function insertClientReference(
  payload: typeof clientReferences.$inferInsert,
): Promise<DbClientReference> {
  const insertValues = payload
  const rows = await db
    .insert(clientReferences)
    .values(insertValues)
    .returning()
  return rows[0]
}

export async function updateClientReference(
  referenceId: string,
  updates: Partial<typeof clientReferences.$inferInsert>,
): Promise<DbClientReference> {
  const setValues = updates
  const rows = await db
    .update(clientReferences)
    .set(setValues)
    .where(eq(clientReferences.id, referenceId))
    .returning()
  return rows[0]
}

export async function deleteClientReference(
  referenceId: string,
): Promise<void> {
  await db.delete(clientReferences).where(eq(clientReferences.id, referenceId))
}
