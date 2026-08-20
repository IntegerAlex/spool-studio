import { desc, eq } from "drizzle-orm"
import { db, type FlexibleInsert } from "@/db"
import { clients } from "@/db/schema"

export type DbClient = typeof clients.$inferSelect

export async function listClients(): Promise<DbClient[]> {
  const rows = await db.select().from(clients).orderBy(desc(clients.created_at))
  return rows
}

export async function listClientOptions(): Promise<
  Pick<DbClient, "id" | "name">[]
> {
  const rows = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .orderBy(clients.name)
  return rows
}

export async function countClients(): Promise<number> {
  const rows = await db.select({ id: clients.id }).from(clients)
  return rows.length
}

export async function getClientById(
  clientId: string,
): Promise<DbClient | null> {
  const rows = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1)
  return rows[0] ?? null
}

export async function insertClient(
  payload: FlexibleInsert<typeof clients.$inferInsert>,
): Promise<DbClient> {
  // SAFETY: payload is FlexibleInsert<$inferInsert>; string dates are valid for DB insert.
  const insertValues = payload as typeof clients.$inferInsert
  const rows = await db
    .insert(clients)
    .values(insertValues)
    .returning()
  return rows[0]
}

export async function updateClient(
  clientId: string,
  updates: Partial<FlexibleInsert<typeof clients.$inferInsert>>,
): Promise<DbClient> {
  // SAFETY: updates is Partial<FlexibleInsert<$inferInsert>>; string dates valid for DB update.
  const setValues = updates as Partial<typeof clients.$inferInsert>
  const rows = await db
    .update(clients)
    .set(setValues)
    .where(eq(clients.id, clientId))
    .returning()
  return rows[0]
}

export async function deleteClient(clientId: string): Promise<void> {
  await db.delete(clients).where(eq(clients.id, clientId))
}
