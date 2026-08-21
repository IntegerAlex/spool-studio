import { desc, eq, gt, isNull, or } from "drizzle-orm"
import { db } from "@/db"
import { clients, portalTokens } from "@/db/schema"

export type DbPortalToken = typeof portalTokens.$inferSelect

export type DbActivePortalTokenWithClient = {
  id: DbPortalToken["id"]
  client_id: DbPortalToken["client_id"]
  token: DbPortalToken["token"]
  expires_at: DbPortalToken["expires_at"]
  created_at: DbPortalToken["created_at"]
  client_name: string
}

export async function listActivePortalTokensWithClientName(): Promise<
  DbActivePortalTokenWithClient[]
> {
  return db
    .select({
      id: portalTokens.id,
      client_id: portalTokens.client_id,
      token: portalTokens.token,
      expires_at: portalTokens.expires_at,
      created_at: portalTokens.created_at,
      client_name: clients.name,
    })
    .from(portalTokens)
    .innerJoin(clients, eq(clients.id, portalTokens.client_id))
    .where(
      or(
        isNull(portalTokens.expires_at),
        gt(portalTokens.expires_at, new Date()),
      ),
    )
    .orderBy(desc(portalTokens.created_at))
}

export async function getPortalTokenByToken(
  token: string,
): Promise<DbPortalToken | null> {
  const rows = await db
    .select()
    .from(portalTokens)
    .where(eq(portalTokens.token, token))
    .limit(1)
  return rows[0] ?? null
}

export async function getPortalTokenById(
  id: string,
): Promise<DbPortalToken | null> {
  const rows = await db
    .select()
    .from(portalTokens)
    .where(eq(portalTokens.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function listPortalTokensByClientId(
  clientId: string,
): Promise<DbPortalToken[]> {
  return db
    .select()
    .from(portalTokens)
    .where(eq(portalTokens.client_id, clientId))
    .orderBy(desc(portalTokens.created_at))
}

export async function insertPortalToken(
  payload: typeof portalTokens.$inferInsert,
): Promise<DbPortalToken> {
  const insertValues = payload
  const rows = await db
    .insert(portalTokens)
    .values(insertValues)
    .returning()
  return rows[0]
}

export async function deletePortalToken(id: string): Promise<void> {
  await db.delete(portalTokens).where(eq(portalTokens.id, id))
}

export async function deletePortalTokensByClientId(
  clientId: string,
): Promise<void> {
  await db.delete(portalTokens).where(eq(portalTokens.client_id, clientId))
}
