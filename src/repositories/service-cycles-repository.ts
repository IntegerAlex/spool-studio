import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import {
  type NewServiceCycle,
  type ServiceCycle,
  serviceCycles,
} from "@/db/schema"

export type DbServiceCycle = ServiceCycle
export type DbNewServiceCycle = NewServiceCycle

export async function listCyclesByClientId(
  clientId: string,
): Promise<DbServiceCycle[]> {
  return db
    .select()
    .from(serviceCycles)
    .where(eq(serviceCycles.client_id, clientId))
    .orderBy(desc(serviceCycles.start_date))
}

export async function getActiveCycleForClient(
  clientId: string,
): Promise<DbServiceCycle | null> {
  const rows = await db
    .select()
    .from(serviceCycles)
    .where(
      and(
        eq(serviceCycles.client_id, clientId),
        eq(serviceCycles.status, "active"),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

export async function getUpcomingCycleForClient(
  clientId: string,
): Promise<DbServiceCycle | null> {
  const rows = await db
    .select()
    .from(serviceCycles)
    .where(
      and(
        eq(serviceCycles.client_id, clientId),
        eq(serviceCycles.status, "upcoming"),
      ),
    )
    .orderBy(serviceCycles.start_date)
    .limit(1)
  return rows[0] ?? null
}

export async function getCycleById(
  cycleId: string,
): Promise<DbServiceCycle | null> {
  const rows = await db
    .select()
    .from(serviceCycles)
    .where(eq(serviceCycles.id, cycleId))
    .limit(1)
  return rows[0] ?? null
}

export async function insertCycle(
  payload: DbNewServiceCycle,
): Promise<DbServiceCycle> {
  const rows = await db.insert(serviceCycles).values(payload).returning()
  return rows[0]
}

export async function updateCycle(
  cycleId: string,
  updates: Partial<DbNewServiceCycle>,
): Promise<DbServiceCycle> {
  const rows = await db
    .update(serviceCycles)
    .set(updates)
    .where(eq(serviceCycles.id, cycleId))
    .returning()
  return rows[0]
}

export async function deleteCycle(cycleId: string): Promise<void> {
  await db.delete(serviceCycles).where(eq(serviceCycles.id, cycleId))
}
