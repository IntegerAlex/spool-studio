import { beforeEach, describe, expect, it, vi } from "vitest"

const { queryMock, requireUserMock, logErrorMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  requireUserMock: vi.fn(),
  logErrorMock: vi.fn(),
}))

// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/lib/db", () => ({
  getPool: () => ({ query: queryMock }),
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
    queryMock.mockReset()
    requireUserMock.mockReset()
    logErrorMock.mockReset()
  })

  it("returns 401 when the user is not authenticated", async () => {
    requireUserMock.mockResolvedValue(null)
    const res = await GET(new Request("http://localhost/api/calendar"))
    expect(res.status).toBe(401)
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("queries with the user id and a widened window and maps rows to events", async () => {
    requireUserMock.mockResolvedValue({ id: "u1" })
    queryMock.mockResolvedValue({
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

// SAFETY: this cast is safe because the value already conforms to the asserted type.
    const sql = queryMock.mock.calls[0][0] as string
// SAFETY: this cast is safe because the value already conforms to the asserted type.
    const params = queryMock.mock.calls[0][1] as unknown[]
    expect(sql).toContain("UNION ALL")
    expect(params[0]).toBe("u1")
    expect(params[1]).toBe("2024-05-01")
    expect(params[2]).toBe("2024-05-31")

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
    queryMock.mockResolvedValue({ rows: [] })

    const res = await GET(new Request("http://localhost/api/calendar"))
    expect(res.status).toBe(200)

// SAFETY: this cast is safe because the value already conforms to the asserted type.
    const params = queryMock.mock.calls[0][1] as string[]
    expect(params[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(params[2]).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const body = await res.json()
    expect(body.data).toEqual([])
  })

  it("returns 500 and logs on query failure", async () => {
    requireUserMock.mockResolvedValue({ id: "u1" })
    queryMock.mockRejectedValue(new Error("boom"))

    const res = await GET(new Request("http://localhost/api/calendar"))
    expect(res.status).toBe(500)
    expect(logErrorMock).toHaveBeenCalledWith(
      "api-calendar-get",
      expect.any(Error),
    )
  })

  it("expands a content_assets row with a recurrence rule into multiple events", async () => {
    requireUserMock.mockResolvedValue({ id: "u1" })
    queryMock.mockResolvedValue({
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
