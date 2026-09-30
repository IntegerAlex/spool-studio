import { getCurrentUser } from "@/lib/auth"
import {
  type DbDayPlan,
  deleteDayPlan,
  getDayPlanById,
  insertDayPlan,
  listDayPlansByDate,
  listDayPlansByDesignerRange,
  updateDayPlan,
} from "@/repositories/day-plans-repository"
import { getClients } from "@/services/clients-service"
import {
  type EngineCycle,
  recommendDay,
} from "@/services/day-plan-engine"
import { getCyclesByClientId } from "@/services/service-cycles-service"
import { getUsers } from "@/services/users-service"
import type {
  CreateDayPlanInput,
  DayPlan,
  DayPlanStatus,
  DayRecommendation,
} from "@/types/index"

const validStatuses: DayPlanStatus[] = ["pending", "in_progress", "done"]

function mapRow(row: DbDayPlan): DayPlan {
  return {
    id: row.id,
    date: row.date,
    designerId: row.designer_id,
    clientId: row.client_id,
    cycleId: row.cycle_id,
    kind: row.kind,
    qty: row.qty,
    doneQty: row.done_qty,
    // SAFETY: status is constrained to the union at every write site below.
    status: row.status as DayPlanStatus,
    referenceIds: row.reference_ids ?? [],
    resultAssetId: row.result_asset_id,
    createdBy: row.created_by ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") throw new Error("Forbidden")
  return user
}

export async function listDayPlans(
  date: string,
  designerId?: string,
): Promise<DayPlan[]> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  const rows = await listDayPlansByDate(date)
  // Designers see only their own rows; admins see all (or one designer's).
  const scoped =
    user.role === "admin"
      ? rows.filter((r) => !designerId || r.designer_id === designerId)
      : rows.filter((r) => r.designer_id === user.id)
  return scoped.map(mapRow)
}

export async function listDesignerHistory(
  designerId: string,
  from: string,
  to: string,
): Promise<DayPlan[]> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  if (user.role !== "admin" && user.id !== designerId) {
    throw new Error("Forbidden")
  }
  return (await listDayPlansByDesignerRange(designerId, from, to)).map(mapRow)
}

export async function createDayPlan(
  input: CreateDayPlanInput,
): Promise<DayPlan> {
  const admin = await requireAdmin()
  if (input.qty < 1) throw new Error("Quantity must be at least 1")
  return mapRow(
    await insertDayPlan({
      date: input.date,
      designer_id: input.designerId,
      client_id: input.clientId,
      cycle_id: input.cycleId ?? null,
      kind: input.kind,
      qty: input.qty,
      reference_ids: input.referenceIds ?? [],
      created_by: admin.id,
    }),
  )
}

export async function updateDayPlanStatus(
  id: string,
  status: DayPlanStatus,
): Promise<DayPlan> {
  await requireAdmin()
  if (!validStatuses.includes(status)) throw new Error("Invalid status")
  const existing = await getDayPlanById(id)
  if (!existing) throw new Error("Day plan not found")
  return mapRow(await updateDayPlan(id, { status }))
}

export async function updateDayPlanDetails(
  id: string,
  fields: {
    qty?: number
    kind?: "reel" | "poster"
    referenceIds?: string[]
    designerId?: string
    date?: string
  },
): Promise<DayPlan> {
  await requireAdmin()
  const existing = await getDayPlanById(id)
  if (!existing) throw new Error("Day plan not found")
  return mapRow(
    await updateDayPlan(id, {
      ...(fields.qty !== undefined && fields.qty >= 1
        ? { qty: fields.qty }
        : {}),
      ...(fields.kind ? { kind: fields.kind } : {}),
      ...(fields.referenceIds ? { reference_ids: fields.referenceIds } : {}),
      ...(fields.designerId ? { designer_id: fields.designerId } : {}),
      ...(fields.date ? { date: fields.date } : {}),
    }),
  )
}

export async function removeDayPlan(id: string): Promise<void> {
  await requireAdmin()
  await deleteDayPlan(id)
}

export async function markDayPlanDone(
  id: string,
  assetId: string,
): Promise<void> {
  const existing = await getDayPlanById(id)
  if (!existing || existing.status === "done") return
  // Each linked upload counts one unit of qty; done only when fulfilled.
  // ponytail: single counter, no per-file ledger; add upload log if partial credit disputes arise
  const doneQty = Math.min(existing.qty, existing.done_qty + 1)
  await updateDayPlan(id, {
    done_qty: doneQty,
    status: doneQty >= existing.qty ? "done" : "in_progress",
    result_asset_id: assetId,
  })
}

export async function recommendDayPlans(
  date: string,
): Promise<DayRecommendation[]> {
  await requireAdmin()
  const [clients, users] = await Promise.all([getClients(), getUsers()])
  const designers = users
    .filter((u) => u.role === "designer")
    .map((u) => ({
      id: u.id,
      name: u.name,
      dailyCapacityUnits: u.dailyCapacityUnits,
    }))
  const cycles: EngineCycle[] = []
  for (const client of clients) {
    const withPlans = await getCyclesByClientId(client.id)
    for (const c of withPlans) {
      if (c.status !== "active") continue
      cycles.push({
        id: c.id,
        clientId: c.clientId,
        clientName: client.name,
        endDate: c.endDate,
        reelsTarget: c.reelsTarget,
        postersTarget: c.postersTarget,
        alreadyPublishedReels: c.alreadyPublishedReels,
        alreadyPublishedPosters: c.alreadyPublishedPosters,
        totalReelsPublished: c.totalReelsPublished,
        totalPostersPublished: c.totalPostersPublished,
      })
    }
  }
  return recommendDay({ cycles, designers, date })
}
