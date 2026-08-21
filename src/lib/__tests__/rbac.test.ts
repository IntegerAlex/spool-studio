import { beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/api-error"
import type { AuthUser } from "@/lib/auth/types"

// oxlint-disable-next-line anti-slop/no-module-mocking  // test mock
vi.mock("@/lib/auth/get-user", () => ({
  requireUser: vi.fn(),
}))

import { requireUser } from "@/lib/auth/get-user"
import { requirePermission } from "@/lib/rbac"

const mockRequireUser = vi.mocked(requireUser)

function makeUser(role: AuthUser["role"]): AuthUser {
  return {
    id: "user-1",
    email: "user@example.com",
    name: "Test User",
    role,
    avatarUrl: null,
  }
}

beforeEach(() => {
  mockRequireUser.mockReset()
})

describe("requirePermission", () => {
  it("rejects anonymous users with 401", async () => {
    mockRequireUser.mockRejectedValue(ApiError.unauthorized())
    await expect(requirePermission("assets:delete")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
    })
  })

  it("rejects a designer for assets:delete with 403", async () => {
    mockRequireUser.mockResolvedValue(makeUser("designer"))
    await expect(requirePermission("assets:delete")).rejects.toBeInstanceOf(
      ApiError,
    )
    await expect(requirePermission("assets:delete")).rejects.toMatchObject({
      status: 403,
    })
  })

  it("resolves an admin for assets:delete and returns the user", async () => {
    const admin = makeUser("admin")
    mockRequireUser.mockResolvedValue(admin)
    await expect(requirePermission("assets:delete")).resolves.toEqual(admin)
  })
})
