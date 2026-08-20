import { asc, eq } from "drizzle-orm"
import { db } from "@/db"
import {
  type ContentPlan,
  contentPlans,
  type NewContentPlan,
} from "@/db/schema"

export type DbContentPlan = ContentPlan
export type DbNewContentPlan = NewContentPlan

export async function listPlansByCycleId(
  cycleId: string,
): Promise<DbContentPlan[]> {
  return db
    .select()
    .from(contentPlans)
    .where(eq(contentPlans.cycle_id, cycleId))
    .orderBy(asc(contentPlans.week_number))
}

export async function listPlansByClientId(
  clientId: string,
): Promise<DbContentPlan[]> {
  return db
    .select()
    .from(contentPlans)
    .where(eq(contentPlans.client_id, clientId))
    .orderBy(asc(contentPlans.week_number))
}

export async function deletePlansByCycleId(cycleId: string): Promise<void> {
  await db.delete(contentPlans).where(eq(contentPlans.cycle_id, cycleId))
}

export async function insertPlans(
  rows: DbNewContentPlan[],
): Promise<DbContentPlan[]> {
  if (rows.length === 0) return []
  return db.insert(contentPlans).values(rows).returning()
}
