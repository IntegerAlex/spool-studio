import { describe, expect, it } from "vitest"
import {
  eventStart,
  eventStartString,
  formatDateKey,
  groupEventsByDay,
  isEventInRange,
  toFloatingLocalISO,
} from "@/lib/calendar-utils"
import type { CalendarEvent } from "@/types/calendar"

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "e1",
    kind: "publish",
    title: "Event",
    clientId: "c1",
    clientName: "Acme",
    start: "2024-05-10T14:00:00",
    href: "/dashboard/assets/e1",
    assetId: "a1",
    uploadQueueId: null,
    platform: null,
    status: "approved",
    note: null,
    caption: null,
    contractEndDate: null,
    ...overrides,
  }
}

describe("formatDateKey", () => {
  it("formats a date as YYYY-MM-DD using local components", () => {
    expect(formatDateKey(new Date(2024, 4, 9))).toBe("2024-05-09")
    expect(formatDateKey(new Date(2024, 11, 31))).toBe("2024-12-31")
  })
})

describe("eventStart", () => {
  it("parses floating local timestamps without tz shift", () => {
    const start = eventStart(makeEvent({ start: "2024-05-10T14:00:00" }))
    expect(start.getFullYear()).toBe(2024)
    expect(start.getMonth()).toBe(4)
    expect(start.getDate()).toBe(10)
    expect(start.getHours()).toBe(14)
  })

  it("parses UTC ISO timestamps", () => {
    const start = eventStart(makeEvent({ start: "2024-05-10T18:30:00Z" }))
    expect(start.toISOString()).toBe("2024-05-10T18:30:00.000Z")
  })
})

describe("isEventInRange", () => {
  const range = { start: "2024-05-01T00:00:00", end: "2024-05-31T23:59:59" }

  it("includes events inside the range", () => {
    expect(
      isEventInRange(makeEvent({ start: "2024-05-10T14:00:00" }), range),
    ).toBe(true)
  })

  it("excludes events outside the range", () => {
    expect(
      isEventInRange(makeEvent({ start: "2024-06-01T00:00:00" }), range),
    ).toBe(false)
    expect(
      isEventInRange(makeEvent({ start: "2024-04-30T00:00:00" }), range),
    ).toBe(false)
  })
})

describe("eventStartString", () => {
  const date = new Date(2024, 4, 10, 14, 30, 0)

  it("emits a floating local timestamp for publish/approval events", () => {
    expect(eventStartString("publish", date)).toBe("2024-05-10T14:30:00")
    expect(eventStartString("approval", date)).toBe("2024-05-10T14:30:00")
  })

  it("emits a UTC ISO string for upload events", () => {
    expect(eventStartString("upload", new Date("2024-05-10T18:30:00Z"))).toBe(
      "2024-05-10T18:30:00.000Z",
    )
  })

  it("emits a date-only string for contract events", () => {
    expect(eventStartString("contract", date)).toBe("2024-05-10")
  })

  it("toFloatingLocalISO pads components", () => {
    expect(toFloatingLocalISO(new Date(2024, 0, 3, 4, 5, 9))).toBe(
      "2024-01-03T04:05:09",
    )
  })
})

describe("groupEventsByDay", () => {
  it("groups events by their local day key", () => {
    const events = [
      makeEvent({ id: "a", start: "2024-05-10T14:00:00" }),
      makeEvent({ id: "b", start: "2024-05-10T18:30:00" }),
      makeEvent({ id: "c", start: "2024-05-11T09:00:00" }),
    ]
    const grouped = groupEventsByDay(events)
    expect(grouped.get("2024-05-10")).toHaveLength(2)
    expect(grouped.get("2024-05-11")).toHaveLength(1)
  })

  it("returns an empty map for no events", () => {
    expect(groupEventsByDay([]).size).toBe(0)
  })
})
