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
