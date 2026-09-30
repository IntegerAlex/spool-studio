export interface WeekRange {
  weekNumber: number
  weekStart: string
  weekEnd: string
}

/**
 * Generate weekly date ranges from a contract period.
 * Last week may be shorter than 7 days (covers remaining contract days).
 */
export function generateWeeks(startDate: string, endDate: string): WeekRange[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const weeks: WeekRange[] = []
  let weekNumber = 1
  let currentStart = new Date(start)

  while (currentStart <= end) {
    const currentEnd = new Date(currentStart)
    currentEnd.setDate(currentEnd.getDate() + 6)
    if (currentEnd > end) {
      currentEnd.setTime(end.getTime())
    }

    weeks.push({
      weekNumber,
      weekStart: formatDate(currentStart),
      weekEnd: formatDate(currentEnd),
    })

    weekNumber++
    currentStart = new Date(currentEnd)
    currentStart.setDate(currentStart.getDate() + 1)
  }

  return weeks
}

/**
 * Distribute deliverables as evenly as possible across weeks.
 * Remainders are spaced evenly, not front-loaded.
 *
 * Example: 6 reels across 5 weeks → [1, 2, 1, 1, 1]
 */
export function distributeDeliverables(
  total: number,
  numWeeks: number,
): number[] {
  if (numWeeks <= 0) return []
  if (total <= 0) return Array.from({ length: numWeeks }, () => 0)

  const base = Math.floor(total / numWeeks)
  const remainder = total - base * numWeeks
  const result = Array.from({ length: numWeeks }, () => base)

  if (remainder > 0) {
    const spacing = Math.max(1, Math.floor(numWeeks / (remainder + 1)))
    for (let i = 0; i < remainder; i++) {
      const pos = (i + 1) * spacing - 1
      if (pos < numWeeks) {
        result[pos] += 1
      }
    }
  }

  return result
}

export type PlanStatus = "on-track" | "behind" | "ahead" | "completed"

/**
 * Spread `total - already` across weeks ending on/after `today`;
 * elapsed weeks get 0. Reuses distributeDeliverables — no extra math lib.
 */
export function distributeRemaining(
  total: number,
  already: number,
  weekEnds: string[],
  today = new Date().toISOString().split("T")[0],
): number[] {
  const remaining = Math.max(0, total - Math.max(0, already))
  const liveIdx = weekEnds
    .map((end, i) => (end >= today ? i : -1))
    .filter((i) => i >= 0)
  // ponytail: all-elapsed cycle yields all-zero plan; backfill flow if admins need retro plans
  if (liveIdx.length === 0) return weekEnds.map(() => 0)
  const spread = distributeDeliverables(remaining, liveIdx.length)
  const result = weekEnds.map(() => 0)
  liveIdx.forEach((weekI, k) => {
    result[weekI] = spread[k]
  })
  return result
}

export function computePlanStatus(planned: number, actual: number): PlanStatus {
  if (planned === 0 && actual === 0) return "completed"
  if (actual >= planned) return "ahead"
  if (actual >= planned * 0.8) return "on-track"
  return "behind"
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
