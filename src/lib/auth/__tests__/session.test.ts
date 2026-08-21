import { beforeEach, describe, expect, it, vi } from "vitest"

// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          limit: async () => rowsToReturn,
        }),
      }),
    })),
  },
}))

let rowsToReturn: Array<{ tokenVersion: number }> = []

import { validateSession } from "../session"
import { signToken } from "../jwt"

const cookieStore = (token: string) => ({
  get: (name: string) =>
    name === "cms_session" ? { value: token } : undefined,
})

const basePayload = {
  sub: "11111111-1111-1111-1111-111111111111",
  email: "test@example.com",
  role: "admin" as const,
  name: "Test User",
}

beforeEach(() => {
  rowsToReturn = []
})

describe("validateSession token_version revocation", () => {
  it("accepts a token whose ver matches the user's current version", async () => {
    rowsToReturn = [{ tokenVersion: 3 }]
    const token = await signToken({ ...basePayload, ver: 3 })
    const user = await validateSession(cookieStore(token))
    expect(user).not.toBeNull()
    expect(user?.id).toBe(basePayload.sub)
  })

  it("rejects a token signed with a stale ver", async () => {
    // Password changed after this token was issued -> version bumped to 2.
    rowsToReturn = [{ tokenVersion: 2 }]
    const staleToken = await signToken({ ...basePayload, ver: 1 })
    expect(await validateSession(cookieStore(staleToken))).toBeNull()
  })

  it("treats a token without ver as version 0", async () => {
    rowsToReturn = [{ tokenVersion: 0 }]
    const legacyToken = await signToken(basePayload)
    expect(await validateSession(cookieStore(legacyToken))).not.toBeNull()

    rowsToReturn = [{ tokenVersion: 1 }]
    expect(await validateSession(cookieStore(legacyToken))).toBeNull()
  })

  it("rejects tokens for users that no longer exist", async () => {
    rowsToReturn = []
    const token = await signToken({ ...basePayload, ver: 0 })
    expect(await validateSession(cookieStore(token))).toBeNull()
  })
})
