import {
  type DbContentPlan,
  deletePlansByCycleId,
  insertPlans,
  listPlansByCycleId,
} from "@/repositories/plans-repository"
import {
  listCycleAssetsForProgress,
  listPublishedAssetsByCycleId,
} from "@/repositories/assets-repository"
import {
  type DbNewServiceCycle,
  type DbServiceCycle,
  deleteCycle,
  getActiveCycleForClient,
  getCycleById,
  getUpcomingCycleForClient,
  insertCycle,
  listCyclesByClientId,
  updateCycle,
} from "@/repositories/service-cycles-repository"
import { distributeRemaining, generateWeeks } from "@/services/plan-utils"
import { ensureSequenceAtLeast } from "@/repositories/numbering-repository"
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
async function fastForwardSequences(
  cycleId: string,
  alreadyReels: number,
  alreadyPosters: number,
): Promise<void> {
  if (alreadyReels > 0) {
    await ensureSequenceAtLeast(cycleId, "reel", alreadyReels + 1)
  }
  if (alreadyPosters > 0) {
    await ensureSequenceAtLeast(cycleId, "poster", alreadyPosters + 1)
  }
}

async function generatePlanForCycle(
  cycleId: string,
  clientId: string,
  startDate: string,
  endDate: string,
  reelsTarget: number,
  postersTarget: number,
  alreadyPublishedReels = 0,
  alreadyPublishedPosters = 0,
): Promise<void> {
  await deletePlansByCycleId(cycleId)

  const weeks = generateWeeks(startDate, endDate)
  const ends = weeks.map((w) => w.weekEnd)
  const reelDistribution = distributeRemaining(
    reelsTarget,
    alreadyPublishedReels,
    ends,
  )
  const posterDistribution = distributeRemaining(
    postersTarget,
    alreadyPublishedPosters,
    ends,
  )

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
    alreadyPublishedReels: row.already_published_reels,
    alreadyPublishedPosters: row.already_published_posters,
    status: row.status,
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
    madeReels: 0,
    madePosters: 0,
    publishedReels: 0,
    publishedPosters: 0,
  }
}

function inWeek(day: string, start: string, end: string): boolean {
  return day >= start && day <= end
}

async function attachWeeklyProgress(
  cycleId: string,
  planRows: ContentPlanRow[],
): Promise<void> {
  try {
    const assets = await listCycleAssetsForProgress(cycleId)
    for (const a of assets) {
      const madeDay = a.uploaded_at
        ? new Date(a.uploaded_at).toISOString().slice(0, 10)
        : null
      const pubDay =
        a.status === "published" && a.published_at
          ? new Date(a.published_at).toISOString().slice(0, 10)
          : null
      for (const p of planRows) {
        if (madeDay && inWeek(madeDay, p.weekStart, p.weekEnd)) {
          if (a.type === "reel") p.madeReels += 1
          else p.madePosters += 1
        }
        if (pubDay && inWeek(pubDay, p.weekStart, p.weekEnd)) {
          if (a.type === "reel") p.publishedReels += 1
          else p.publishedPosters += 1
        }
      }
    }
    // Overflow allotment: a week shows at most its plan; extras spill
    // forward (W2 2-made/1-planned → W2 1/1, W3 +1). Published stays raw.
    spillOver(planRows, "madeReels", "plannedReels")
    spillOver(planRows, "madePosters", "plannedPosters")
  } catch {
    // Weekly progress is best-effort; totals still work.
  }
}

function spillOver(
  rows: ContentPlanRow[],
  madeKey: "madeReels" | "madePosters",
  plannedKey: "plannedReels" | "plannedPosters",
): void {
  for (let i = 0; i < rows.length - 1; i++) {
    const excess = Math.max(0, rows[i][madeKey] - rows[i][plannedKey])
    if (excess > 0) {
      rows[i][madeKey] -= excess
      rows[i + 1][madeKey] += excess
    }
  }
}

async function computeActuals(
  cycleId: string,
): Promise<{ totalReelsPublished: number; totalPostersPublished: number }> {
  const assets = await listPublishedAssetsByCycleId(cycleId)

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

    // Per-week made (uploaded) + published counts from cycle assets.
    const planRows = plans.map(mapPlanRow)
    await attachWeeklyProgress(cycle.id, planRows)

    result.push({
      ...mapCycle(cycle),
      plans: planRows,
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

  const planRows = plans.map(mapPlanRow)
  await attachWeeklyProgress(cycle.id, planRows)

  return {
    ...mapCycle(cycle),
    plans: planRows,
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
    already_published_reels: input.alreadyPublishedReels ?? 0,
    already_published_posters: input.alreadyPublishedPosters ?? 0,
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
    input.alreadyPublishedReels ?? 0,
    input.alreadyPublishedPosters ?? 0,
  )

  // Reserve carry-in numbers so the next new asset continues the count.
  await fastForwardSequences(
    cycle.id,
    input.alreadyPublishedReels ?? 0,
    input.alreadyPublishedPosters ?? 0,
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
    alreadyPublishedReels: input.alreadyPublishedReels,
    alreadyPublishedPosters: input.alreadyPublishedPosters,
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
    alreadyPublishedReels?: number
    alreadyPublishedPosters?: number
  },
): Promise<ServiceCycle> {
  await getOrCreateCurrentUserProfile()

  const existing = await getCycleById(cycleId)
  if (!existing) {
    throw new Error("Cycle not found")
  }

  const updates: Partial<DbNewServiceCycle> = {}
  if (input.startDate !== undefined) updates.start_date = input.startDate
  if (input.endDate !== undefined) updates.end_date = input.endDate
  if (input.reelsTarget !== undefined) updates.reels_target = input.reelsTarget
  if (input.postersTarget !== undefined)
    updates.posters_target = input.postersTarget
  if (input.alreadyPublishedReels !== undefined)
    updates.already_published_reels = input.alreadyPublishedReels
  if (input.alreadyPublishedPosters !== undefined)
    updates.already_published_posters = input.alreadyPublishedPosters

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
        updatedCycle.already_published_reels,
        updatedCycle.already_published_posters,
      )
      await fastForwardSequences(
        cycleId,
        updatedCycle.already_published_reels,
        updatedCycle.already_published_posters,
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
