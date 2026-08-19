import { describe, expect, it } from "vitest"
import { expandRecurrence, occurrencesBetween } from "@/lib/calendar-recurrence"
import type { CalendarEvent, RecurrenceRule } from "@/types/calendar"

function makeBase(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "base1",
    kind: "publish",
    title: "Event",
    clientId: "c1",
    clientName: "Acme",
    start: "2024-05-10T14:00:00",
    href: "/dashboard/assets/base1",
    assetId: "base1",
    uploadQueueId: null,
    platform: null,
    status: "approved",
    note: null,
    caption: null,
    contractEndDate: null,
    ...overrides,
  }
}

const rangeStart = new Date("2024-05-01T00:00:00Z")
const rangeEnd = new Date("2024-05-31T23:59:59Z")

describe("occurrencesBetween", () => {
  it("returns only the start when no recurrence rule is implied by count=1", () => {
    const start = new Date("2024-05-10T14:00:00")
    const rule: RecurrenceRule = { freq: "daily", count: 1 }
    const result = occurrencesBetween(start, rule, rangeStart, rangeEnd)
    expect(result).toHaveLength(1)
    expect(result[0].getTime()).toBe(start.getTime())
  })

  it("generates daily occurrences with interval", () => {
    const start = new Date("2024-05-10T14:00:00")
    const rule: RecurrenceRule = { freq: "daily", interval: 2, count: 3 }
    const result = occurrencesBetween(start, rule, rangeStart, rangeEnd)
    expect(result.map((d) => d.getDate())).toEqual([10, 12, 14])
  })

  it("generates weekly occurrences", () => {
    const start = new Date("2024-05-10T14:00:00")
    const rule: RecurrenceRule = { freq: "weekly", count: 3 }
    const result = occurrencesBetween(start, rule, rangeStart, rangeEnd)
    expect(result.map((d) => d.getDate())).toEqual([10, 17, 24])
  })

  it("generates monthly occurrences and allows overflow", () => {
    const start = new Date("2024-01-31T09:00:00")
    const rule: RecurrenceRule = { freq: "monthly", count: 3 }
    const rStart = new Date("2024-01-01T00:00:00Z")
    const rEnd = new Date("2024-12-31T23:59:59Z")
    const result = occurrencesBetween(start, rule, rStart, rEnd)
    expect(result).toHaveLength(3)
    // Jan 31 -> Mar 2/3 (Feb has 29 days in 2024 leap year -> Mar 2), then Apr 2
    expect(result[0].getMonth()).toBe(0)
    expect(result[1].getMonth()).toBe(2)
    expect(result[2].getMonth()).toBe(3)
  })

  it("respects a count limit", () => {
    const start = new Date("2024-05-10T14:00:00")
    const rule: RecurrenceRule = { freq: "daily", count: 3 }
    const result = occurrencesBetween(start, rule, rangeStart, rangeEnd)
    expect(result).toHaveLength(3)
  })

  it("respects an until limit", () => {
    const start = new Date("2024-05-10T14:00:00")
    const rule: RecurrenceRule = {
      freq: "daily",
      until: "2024-05-12T23:59:59",
    }
    const result = occurrencesBetween(start, rule, rangeStart, rangeEnd)
    expect(result.map((d) => d.getDate())).toEqual([10, 11, 12])
  })

  it("excludes occurrences outside the range", () => {
    const start = new Date("2024-04-01T14:00:00")
    const rule: RecurrenceRule = { freq: "weekly", count: 10 }
    const result = occurrencesBetween(start, rule, rangeStart, rangeEnd)
    // Weekly from Apr 1 hits May 6, 13, 20, 27 inside the May window.
    expect(result.every((d) => d >= rangeStart && d <= rangeEnd)).toBe(true)
    expect(result.map((d) => d.getDate())).toEqual([6, 13, 20, 27])
  })

  it("omits the start occurrence when it falls before the range", () => {
    const start = new Date("2024-04-01T14:00:00")
    const rule: RecurrenceRule = { freq: "daily", count: 10 }
    const result = occurrencesBetween(start, rule, rangeStart, rangeEnd)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0] >= rangeStart).toBe(true)
  })
})

describe("expandRecurrence", () => {
  it("returns the base event unchanged when there is no recurrence", () => {
    const base = makeBase()
    const result = expandRecurrence(base, rangeStart, rangeEnd)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(base)
  })

  it("builds one event per occurrence with stable ids and series metadata", () => {
    const base = makeBase({
      recurrence: { freq: "daily", count: 3 } as RecurrenceRule,
    })
    const result = expandRecurrence(base, rangeStart, rangeEnd)
    expect(result).toHaveLength(3)
    expect(result.map((e) => e.id)).toEqual([
      "base1__0",
      "base1__1",
      "base1__2",
    ])
    for (let i = 0; i < result.length; i++) {
      const ev = result[i]
      expect(ev.seriesId).toBe("base1")
      expect(ev.occurrenceIndex).toBe(i)
      expect(ev.recurrence).toBe(base.recurrence)
    }
  })

  it("uses the upload kind start format for expanded occurrences", () => {
    const base = makeBase({
      kind: "upload",
      start: "2024-05-10T14:00:00Z",
      recurrence: { freq: "weekly", count: 2 } as RecurrenceRule,
    })
    const result = expandRecurrence(base, rangeStart, rangeEnd)
    expect(result[1].start).toMatch(/Z$/)
  })
})
