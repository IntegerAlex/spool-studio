import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { contentAssets } from "@/db/schema"
import {
  type DbContentPlan,
  deletePlansByCycleId,
  insertPlans,
  listPlansByCycleId,
} from "@/repositories/plans-repository"
import {
  type DbServiceCycle,
  deleteCycle,
  getActiveCycleForClient,
  getCycleById,
  getUpcomingCycleForClient,
  insertCycle,
  listCyclesByClientId,
  updateCycle,
} from "@/repositories/service-cycles-repository"
import { distributeDeliverables, generateWeeks } from "@/services/plan-utils"
import { getOrCreateCurrentUserProfile } from "@/services/users-service"
import type {
  ContentPlanRow,
  CreateCycleInput,
  CycleStatus,
  ServiceCycle,
  ServiceCycleWithPlan,
} from "@/types/index"

/**
 * Generate content plan using TypeScript (not the SQL RPC, which has an
 * integer-division bug). Uses the proven plan-utils.ts functions.
 */
async function generatePlanForCycle(
  cycleId: string,
  clientId: string,
  startDate: string,
  endDate: string,
  reelsTarget: number,
  postersTarget: number,
): Promise<void> {
  await deletePlansByCycleId(cycleId)

  const weeks = generateWeeks(startDate, endDate)
  const reelDistribution = distributeDeliverables(reelsTarget, weeks.length)
  const posterDistribution = distributeDeliverables(postersTarget, weeks.length)

  const planRows = weeks.map((week, i) => ({
    cycle_id: cycleId,
    client_id: clientId,
    week_number: week.weekNumber,
    week_start: week.weekStart,
    week_end: week.weekEnd,
    planned_reels: reelDistribution[i],
    planned_posters: posterDistribution[i],
  }))

  await insertPlans(planRows)
}

function mapCycle(row: DbServiceCycle): ServiceCycle {
  return {
    id: row.id,
    clientId: row.client_id,
    startDate: row.start_date,
    endDate: row.end_date,
    reelsTarget: row.reels_target,
    postersTarget: row.posters_target,
    status: row.status as CycleStatus,
    createdBy: row.created_by ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function mapPlanRow(row: DbContentPlan): ContentPlanRow {
  return {
    id: row.id,
    cycleId: row.cycle_id,
    clientId: row.client_id,
    weekNumber: row.week_number,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    plannedReels: row.planned_reels,
    plannedPosters: row.planned_posters,
  }
}

async function computeActuals(
  cycleId: string,
): Promise<{ totalReelsPublished: number; totalPostersPublished: number }> {
  const assets = await db
    .select({ type: contentAssets.type, status: contentAssets.status })
    .from(contentAssets)
    .where(
      and(
        eq(contentAssets.cycle_id, cycleId),
        inArray(contentAssets.status, ["published", "scheduled"]),
      ),
    )

  let totalReelsPublished = 0
  let totalPostersPublished = 0
  for (const asset of assets) {
    if (asset.status === "published") {
      if (asset.type === "reel") totalReelsPublished++
      else if (asset.type === "poster") totalPostersPublished++
    }
  }

  return { totalReelsPublished, totalPostersPublished }
}

/**
 * Find the active cycle for a client.
 * Implements lazy auto-activation: if no active cycle exists, checks for
 * upcoming cycles whose start_date has passed and activates them.
 */
export async function getActiveCycleForClientService(
  clientId: string,
): Promise<ServiceCycle | null> {
  const active = await getActiveCycleForClient(clientId)
  if (active) return mapCycle(active)

  const today = new Date().toISOString().split("T")[0]
  const upcoming = await getUpcomingCycleForClient(clientId)
  if (upcoming && upcoming.start_date <= today) {
    const updated = await updateCycle(upcoming.id, { status: "active" })
    return mapCycle(updated)
  }

  return null
}

export async function getCyclesByClientId(
  clientId: string,
): Promise<ServiceCycleWithPlan[]> {
  const cycles = await listCyclesByClientId(clientId)
  const result: ServiceCycleWithPlan[] = []

  for (const cycle of cycles) {
    const plans = await listPlansByCycleId(cycle.id)
    const { totalReelsPublished, totalPostersPublished } = await computeActuals(
      cycle.id,
    )

    result.push({
      ...mapCycle(cycle),
      plans: plans.map(mapPlanRow),
      totalReelsPlanned: plans.reduce((sum, p) => sum + p.planned_reels, 0),
      totalPostersPlanned: plans.reduce((sum, p) => sum + p.planned_posters, 0),
      totalReelsPublished,
      totalPostersPublished,
    })
  }

  return result
}

export async function getCycleByIdService(
  cycleId: string,
): Promise<ServiceCycleWithPlan | null> {
  const cycle = await getCycleById(cycleId)
  if (!cycle) return null

  const plans = await listPlansByCycleId(cycle.id)
  const { totalReelsPublished, totalPostersPublished } = await computeActuals(
    cycle.id,
  )

  return {
    ...mapCycle(cycle),
    plans: plans.map(mapPlanRow),
    totalReelsPlanned: plans.reduce((sum, p) => sum + p.planned_reels, 0),
    totalPostersPlanned: plans.reduce((sum, p) => sum + p.planned_posters, 0),
    totalReelsPublished,
    totalPostersPublished,
  }
}

export async function createCycle(
  input: CreateCycleInput,
): Promise<ServiceCycle> {
  const user = await getOrCreateCurrentUserProfile()

  const today = new Date().toISOString().split("T")[0]
  const initialStatus: CycleStatus =
    input.startDate <= today ? "active" : "upcoming"

  if (initialStatus === "active") {
    const existingActive = await getActiveCycleForClient(input.clientId)
    if (existingActive) {
      await updateCycle(existingActive.id, { status: "completed" })
    }
  }

  const cycle = await insertCycle({
    client_id: input.clientId,
    start_date: input.startDate,
    end_date: input.endDate,
    reels_target: input.reelsTarget,
    posters_target: input.postersTarget,
    status: initialStatus,
    created_by: user.id,
  })

  await generatePlanForCycle(
    cycle.id,
    input.clientId,
    input.startDate,
    input.endDate,
    input.reelsTarget,
    input.postersTarget,
  )

  return mapCycle(cycle)
}

export async function renewCycle(
  currentCycleId: string,
  input: Omit<CreateCycleInput, "clientId">,
): Promise<ServiceCycle> {
  const currentCycle = await getCycleById(currentCycleId)
  if (!currentCycle) {
    throw new Error("Current cycle not found")
  }

  await updateCycle(currentCycleId, { status: "completed" })

  return createCycle({
    clientId: currentCycle.client_id,
    startDate: input.startDate,
    endDate: input.endDate,
    reelsTarget: input.reelsTarget,
    postersTarget: input.postersTarget,
  })
}

export async function cancelCycleService(cycleId: string): Promise<void> {
  await updateCycle(cycleId, { status: "cancelled" })
}

export async function completeCycleService(cycleId: string): Promise<void> {
  await updateCycle(cycleId, { status: "completed" })
}

export async function updateCycleDeliverables(
  cycleId: string,
  input: {
    startDate?: string
    endDate?: string
    reelsTarget?: number
    postersTarget?: number
  },
): Promise<ServiceCycle> {
  await getOrCreateCurrentUserProfile()

  const existing = await getCycleById(cycleId)
  if (!existing) {
    throw new Error("Cycle not found")
  }

  const updates: Record<string, unknown> = {}
  if (input.startDate !== undefined) updates.start_date = input.startDate
  if (input.endDate !== undefined) updates.end_date = input.endDate
  if (input.reelsTarget !== undefined) updates.reels_target = input.reelsTarget
  if (input.postersTarget !== undefined)
    updates.posters_target = input.postersTarget

  if (Object.keys(updates).length > 0) {
    await updateCycle(cycleId, updates)

    const updatedCycle = await getCycleById(cycleId)
    if (updatedCycle) {
      await generatePlanForCycle(
        cycleId,
        updatedCycle.client_id,
        updatedCycle.start_date,
        updatedCycle.end_date,
        updatedCycle.reels_target,
        updatedCycle.posters_target,
      )
    }
  }

  const updated = await getCycleById(cycleId)
  if (!updated) {
    throw new Error("Cycle not found after update")
  }
  return mapCycle(updated)
}

export async function deleteCycleService(cycleId: string): Promise<void> {
  await deleteCycle(cycleId)
}
