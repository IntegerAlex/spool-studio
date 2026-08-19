import { describe, expect, it } from "vitest"
import { eventsToICS } from "@/lib/calendar-ics"
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

describe("eventsToICS", () => {
  it("wraps events in a VCALENDAR", () => {
    const ics = eventsToICS([makeEvent()])
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true)
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true)
    expect(ics).toContain("BEGIN:VEVENT")
    expect(ics).toContain("END:VEVENT")
  })

  it("emits floating-local DTSTART for publish events", () => {
    const ics = eventsToICS([
      makeEvent({ kind: "publish", start: "2024-05-10T14:00:00" }),
    ])
    expect(ics).toContain("DTSTART:20240510T140000")
  })

  it("emits UTC DTSTART for upload events", () => {
    const ics = eventsToICS([
      makeEvent({ kind: "upload", start: "2024-05-10T18:30:00Z" }),
    ])
    expect(ics).toContain("DTSTART:20240510T183000Z")
  })

  it("emits date-only DTSTART for contract events", () => {
    const ics = eventsToICS([
      makeEvent({ kind: "contract", clientId: null, start: "2024-05-10" }),
    ])
    expect(ics).toContain("DTSTART:20240510")
  })

  it("escapes commas in summary", () => {
    const ics = eventsToICS([makeEvent({ title: "A, B and C" })])
    expect(ics).toContain("SUMMARY:A\\, B and C")
  })
})
