import { and, desc, eq, gte, lte } from "drizzle-orm"
import { db } from "@/db"
import { type DayPlan, type NewDayPlan, dayPlans } from "@/db/schema"

export type DbDayPlan = DayPlan
export type DbNewDayPlan = NewDayPlan

export async function listDayPlansByDate(
  date: string,
): Promise<DbDayPlan[]> {
  return db
    .select()
    .from(dayPlans)
    .where(eq(dayPlans.date, date))
    .orderBy(dayPlans.designer_id)
}

export async function listDayPlansByDesignerRange(
  designerId: string,
  from: string,
  to: string,
): Promise<DbDayPlan[]> {
  return db
    .select()
    .from(dayPlans)
    .where(
      and(
        eq(dayPlans.designer_id, designerId),
        gte(dayPlans.date, from),
        lte(dayPlans.date, to),
      ),
    )
    .orderBy(desc(dayPlans.date))
}

export async function getDayPlanById(
  id: string,
): Promise<DbDayPlan | null> {
  const rows = await db
    .select()
    .from(dayPlans)
    .where(eq(dayPlans.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function insertDayPlan(
  payload: DbNewDayPlan,
): Promise<DbDayPlan> {
  const rows = await db.insert(dayPlans).values(payload).returning()
  return rows[0]
}

export async function updateDayPlan(
  id: string,
  updates: Partial<DbNewDayPlan>,
): Promise<DbDayPlan> {
  const rows = await db
    .update(dayPlans)
    .set(updates)
    .where(eq(dayPlans.id, id))
    .returning()
  return rows[0]
}

export async function deleteDayPlan(id: string): Promise<void> {
  await db.delete(dayPlans).where(eq(dayPlans.id, id))
}

export async function deleteDayPlansByClientId(clientId: string): Promise<void> {
  await db.delete(dayPlans).where(eq(dayPlans.client_id, clientId))
}
