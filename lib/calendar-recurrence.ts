import { eventStartString } from "@/lib/calendar-utils"
import type { CalendarEvent, RecurrenceRule } from "@/types/calendar"

const MAX_ITERATIONS = 1000

function normalizeInterval(rule: RecurrenceRule): number {
  const raw = rule.interval ?? 1
  return raw >= 1 ? Math.floor(raw) : 1
}

function advance(
  start: Date,
  freq: RecurrenceRule["freq"],
  step: number,
): Date {
  const next = new Date(start)
  if (freq === "daily") {
    next.setDate(next.getDate() + step)
  } else if (freq === "weekly") {
    next.setDate(next.getDate() + step * 7)
  } else {
    next.setMonth(next.getMonth() + step)
  }
  return next
}

export function occurrencesBetween(
  start: Date,
  rule: RecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const interval = normalizeInterval(rule)
  const result: Date[] = []

  let current = new Date(start)
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (current.getTime() > rangeEnd.getTime()) break
    if (rule.until && current.getTime() > new Date(rule.until).getTime()) break
    if (
      current.getTime() >= rangeStart.getTime() &&
      current.getTime() <= rangeEnd.getTime()
    ) {
      result.push(new Date(current))
    }
    if (rule.count !== null && rule.count !== undefined) {
      if (result.length >= rule.count) break
    }
    current = advance(current, rule.freq, interval)
  }

  return result
}

export function expandRecurrence(
  base: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEvent[] {
  if (!base.recurrence) return [base]

  const start = new Date(base.start)
  const occDates = occurrencesBetween(
    start,
    base.recurrence,
    rangeStart,
    rangeEnd,
  )

  return occDates.map((occDate, i) => ({
    ...base,
    id: `${base.id}__${i}`,
    seriesId: base.id,
    occurrenceIndex: i,
    start: eventStartString(base.kind, occDate),
  }))
}
