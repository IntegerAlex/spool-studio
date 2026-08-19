import { beforeEach, describe, expect, it, vi } from "vitest"

const fetchMock = vi.fn()
vi.stubGlobal("fetch", fetchMock)

import { calendarApi } from "@/lib/api-client"
import type { CalendarEvent } from "@/types/calendar"

function jsonResponse<T>(body: T): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

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

describe("calendarApi.reschedule routing", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(jsonResponse({ data: {} }))
  })

  it("PATCHes the asset for publish events", async () => {
    const event = makeEvent({
      kind: "publish",
      assetId: "a1",
      start: "2024-05-10T14:00:00",
    })
    const result = await calendarApi.reschedule(
      event,
      new Date(2024, 5, 12, 9, 30),
    )

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain("/api/assets/a1")
    expect(init.method).toBe("PATCH")
    const body = JSON.parse(init.body)
    expect(body.publishDate).toBe("2024-06-12")
    expect(body.publishTime).toBe("09:30:00")
    expect(result.start).toBe("2024-06-12T09:30:00")
  })

  it("PATCHes the upload queue for upload events", async () => {
    const event = makeEvent({
      kind: "upload",
      assetId: "a1",
      uploadQueueId: "q1",
      start: "2024-05-10T18:30:00Z",
    })
    const result = await calendarApi.reschedule(
      event,
      new Date("2024-06-12T16:00:00Z"),
    )

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain("/api/queue/q1")
    expect(init.method).toBe("PATCH")
    const body = JSON.parse(init.body)
    expect(body.scheduledDate).toBe("2024-06-12T16:00:00.000Z")
    expect(result.start).toBe("2024-06-12T16:00:00.000Z")
  })

  it("PATCHes the client for contract events", async () => {
    const event = makeEvent({
      kind: "contract",
      clientId: "c1",
      assetId: null,
      start: "2024-05-01",
    })
    const result = await calendarApi.reschedule(event, new Date(2024, 5, 15))

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain("/api/clients/c1")
    expect(init.method).toBe("PATCH")
    const body = JSON.parse(init.body)
    expect(body.contractStartDate).toBe("2024-06-15")
    expect(result.start).toBe("2024-06-15")
  })

  it("throws when the event cannot be rescheduled", async () => {
    const event = makeEvent({
      kind: "approval",
      assetId: null,
      start: "2024-05-10T14:00:00",
    })
    await expect(
      calendarApi.reschedule(event, new Date(2024, 5, 12)),
    ).rejects.toThrow()
  })
})

describe("calendarApi.create", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(jsonResponse({ data: {} }))
  })

  it("creates an upload queue entry", async () => {
    await calendarApi.createUpload({
      assetId: "a1",
      platform: "instagram",
      start: new Date("2024-06-12T16:00:00Z"),
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain("/api/queue")
    expect(init.method).toBe("POST")
    const body = JSON.parse(init.body)
    expect(body.assetId).toBe("a1")
    expect(body.platform).toBe("instagram")
    expect(body.scheduledDate).toBe("2024-06-12T16:00:00.000Z")
    expect(body.status).toBe("scheduled")
  })

  it("sets publish date + scheduled status on the asset", async () => {
    await calendarApi.createPublish({
      assetId: "a1",
      start: new Date(2024, 5, 12, 9, 30),
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain("/api/assets/a1")
    expect(init.method).toBe("PATCH")
    const body = JSON.parse(init.body)
    expect(body.publishDate).toBe("2024-06-12")
    expect(body.publishTime).toBe("09:30:00")
    expect(body.status).toBe("scheduled")
  })
})
