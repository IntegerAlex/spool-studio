import { beforeEach, describe, expect, it, vi } from "vitest"

const { executeMock, requireUserMock, logErrorMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
  requireUserMock: vi.fn(),
  logErrorMock: vi.fn(),
}))

// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/db", () => ({
  db: { execute: executeMock },
}))

// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/lib/auth", () => ({
  requireUser: requireUserMock,
}))

// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/lib/runtime-diagnostics", () => ({
  logProductionRuntimeError: logErrorMock,
}))

import { GET } from "@/app/api/calendar/route"

// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type  // dynamic external payload
function row(overrides: Record<string, unknown> = {}) {
  return {
    source_id: "a1",
    kind: "publish",
    title: "Post",
    client_id: "c1",
    client_name: "Acme",
    start_value: "2024-05-10T14:00:00",
    href: "/dashboard/assets/a1",
    asset_id: "a1",
    upload_queue_id: null,
    platform: null,
    status_value: "approved",
    note: null,
    ...overrides,
  }
}

describe("GET /api/calendar", () => {
  beforeEach(() => {
    executeMock.mockReset()
    requireUserMock.mockReset()
    logErrorMock.mockReset()
  })

  it("returns 401 when the user is not authenticated", async () => {
    requireUserMock.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost/api/calendar"))
    expect(res.status).toBe(401)
    expect(executeMock).not.toHaveBeenCalled()
  })

  it("queries with the user id and a widened window and maps rows to events", async () => {
    requireUserMock.mockResolvedValue({ id: "u1" })
    executeMock.mockResolvedValue({
      rows: [
        row(),
        row({
          source_id: "q1",
          kind: "upload",
          title: "Upload",
          start_value: "2024-05-12T18:30:00Z",
          upload_queue_id: "q1",
          platform: "instagram",
          status_value: "scheduled",
        }),
        row({
          source_id: "contract-c1",
          kind: "contract",
          title: "Acme contract",
          client_id: "c1",
          start_value: "2024-05-01",
          href: "/dashboard/clients/c1",
          asset_id: null,
          status_value: null,
        }),
        row({
          source_id: "a2",
          kind: "approval",
          title: "Needs review",
          status_value: "ready_for_review",
        }),
      ],
    })

    const res = await GET(
      new Request(
        "http://localhost/api/calendar?start=2024-05-01&end=2024-05-31",
      ),
    )
    expect(res.status).toBe(200)

    const sqlFragment = executeMock.mock.calls[0][0]
    expect(sqlFragment).toBeDefined()
    expect(executeMock).toHaveBeenCalledTimes(1)

    const body = await res.json()
    expect(body.data).toHaveLength(4)
    expect(body.data[0]).toMatchObject({
      id: "a1",
      kind: "publish",
      clientName: "Acme",
      start: "2024-05-10T14:00:00",
      assetId: "a1",
    })
    expect(body.data[1]).toMatchObject({
      id: "q1",
      kind: "upload",
      platform: "instagram",
      uploadQueueId: "q1",
      start: "2024-05-12T18:30:00Z",
    })
    expect(body.data[2]).toMatchObject({
      id: "contract-c1",
      kind: "contract",
      href: "/dashboard/clients/c1",
    })
    expect(body.data[3]).toMatchObject({
      id: "a2",
      kind: "approval",
      status: "ready_for_review",
    })
  })

  it("defaults to the current month when no range is provided", async () => {
    requireUserMock.mockResolvedValue({ id: "u1" })
    executeMock.mockResolvedValue({ rows: [] })

    const res = await GET(new Request("http://localhost/api/calendar"))
    expect(res.status).toBe(200)

    expect(executeMock).toHaveBeenCalledTimes(1)
    expect(executeMock.mock.calls[0][0]).toBeDefined()

    const body = await res.json()
    expect(body.data).toEqual([])
  })

  it("returns 500 and logs on query failure", async () => {
    requireUserMock.mockResolvedValue({ id: "u1" })
    executeMock.mockRejectedValue(new Error("boom"))

    const res = await GET(new Request("http://localhost/api/calendar"))
    expect(res.status).toBe(500)
    expect(logErrorMock).toHaveBeenCalledWith(
      "api-calendar-get",
      expect.any(Error),
    )
  })

  it("expands a content_assets row with a recurrence rule into multiple events", async () => {
    requireUserMock.mockResolvedValue({ id: "u1" })
    executeMock.mockResolvedValue({
      rows: [
        row({
          source_id: "a1",
          start_value: "2024-05-10T14:00:00",
          recurrence: { freq: "daily", interval: 1, count: 3 },
        }),
      ],
    })

    const res = await GET(
      new Request(
        "http://localhost/api/calendar?start=2024-05-01&end=2024-05-31",
      ),
    )
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data).toHaveLength(3)
    expect(body.data.map((e: { id: string }) => e.id)).toEqual([
      "a1__0",
      "a1__1",
      "a1__2",
    ])
    expect(body.data[0]).toMatchObject({
      id: "a1__0",
      seriesId: "a1",
      occurrenceIndex: 0,
      recurrence: { freq: "daily", interval: 1, count: 3 },
      kind: "publish",
    })
  })
})
