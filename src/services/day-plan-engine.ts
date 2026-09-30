import { computePlanStatus } from "./plan-utils"

export const UNITS_PER_REEL = 2
export const UNITS_PER_POSTER = 1

export interface EngineCycle {
  id: string
  clientId: string
  clientName: string
  endDate: string
  reelsTarget: number
  postersTarget: number
  alreadyPublishedReels: number
  alreadyPublishedPosters: number
  totalReelsPublished: number
  totalPostersPublished: number
}

export interface EngineDesigner {
  id: string
  name: string
  dailyCapacityUnits: number
}

export interface EngineRecommendation {
  designerId: string
  clientId: string
  cycleId: string
  kind: "reel" | "poster"
  qty: number
  reason: string
}

export function isWorkday(dateStr: string): boolean {
  const day = new Date(dateStr + "T00:00:00").getDay()
  return day >= 1 && day <= 6
}

function workdaysLeft(from: string, end: string): number {
  let count = 0
  const cur = new Date(from + "T00:00:00")
  const last = new Date(end + "T00:00:00")
  // ponytail: day-by-day walk, fine for cycle-length ranges; range math if cycles ever span years
  while (cur <= last) {
    const d = cur.getDay()
    if (d >= 1 && d <= 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function remainingReels(c: EngineCycle): number {
  return Math.max(
    0,
    c.reelsTarget - c.alreadyPublishedReels - c.totalReelsPublished,
  )
}

function remainingPosters(c: EngineCycle): number {
  return Math.max(
    0,
    c.postersTarget - c.alreadyPublishedPosters - c.totalPostersPublished,
  )
}

/**
 * Suggest one day of tasks. Deterministic: behind-first, fewest workdays
 * left, reels before posters, poster-only fill when reels run out.
 */
export function recommendDay(input: {
  cycles: EngineCycle[]
  designers: EngineDesigner[]
  date: string
}): EngineRecommendation[] {
  if (!isWorkday(input.date)) return []

  const ranked = input.cycles
    .map((c) => {
      const needR = remainingReels(c)
      const needP = remainingPosters(c)
      const planned = Math.max(
        0,
        c.reelsTarget - c.alreadyPublishedReels,
      ) + Math.max(0, c.postersTarget - c.alreadyPublishedPosters)
      const actual = c.totalReelsPublished + c.totalPostersPublished
      return {
        cycle: c,
        needR,
        needP,
        behind: computePlanStatus(planned, actual) === "behind",
        days: workdaysLeft(input.date, c.endDate),
      }
    })
    .filter((r) => (r.needR > 0 || r.needP > 0) && r.days > 0)
    .sort(
      (a, b) =>
        Number(b.behind) - Number(a.behind) || a.days - b.days,
    )

  const out: EngineRecommendation[] = []
  for (const d of input.designers) {
    let free = Math.max(0, d.dailyCapacityUnits)
    for (const r of ranked) {
      if (free <= 0) break
      // Reels take at most half the free day so posters share the load
      // (2R day, 1R+2P day, or poster-only fill all fall out naturally).
      const reelBudget = Math.ceil(free / 2)
      const takeR = Math.min(
        r.needR,
        Math.floor(reelBudget / UNITS_PER_REEL),
      )
      if (takeR > 0) {
        out.push({
          designerId: d.id,
          clientId: r.cycle.clientId,
          cycleId: r.cycle.id,
          kind: "reel",
          qty: takeR,
          reason: `${r.cycle.clientName} needs ${r.needR} reels, ${r.days} workdays left${r.behind ? " (behind)" : ""}`,
        })
        r.needR -= takeR
        free -= takeR * UNITS_PER_REEL
      }
      const takeP = Math.min(r.needP, Math.floor(free / UNITS_PER_POSTER))
      if (takeP > 0) {
        out.push({
          designerId: d.id,
          clientId: r.cycle.clientId,
          cycleId: r.cycle.id,
          kind: "poster",
          qty: takeP,
          reason:
            r.needR === 0
              ? `${r.cycle.clientName} reels done — poster-only fill`
              : `${r.cycle.clientName} needs ${r.needP} posters, ${r.days} workdays left`,
        })
        r.needP -= takeP
        free -= takeP * UNITS_PER_POSTER
      }
    }
  }
  return out
}
