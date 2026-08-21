import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// SAFETY: tests intentionally mutate the process env; Node types mark it read-only.
const testEnv = process.env as { NODE_ENV?: string; JWT_SECRET?: string }
const ORIGINAL_NODE_ENV = process.env.NODE_ENV
const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET

describe("jwt fail-fast guard", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    if (ORIGINAL_NODE_ENV === undefined) {
      delete testEnv.NODE_ENV
    } else {
      testEnv.NODE_ENV = ORIGINAL_NODE_ENV
    }
    if (ORIGINAL_JWT_SECRET === undefined) {
      delete testEnv.JWT_SECRET
    } else {
      testEnv.JWT_SECRET = ORIGINAL_JWT_SECRET
    }
  })

  it("throws when imported in production without JWT_SECRET", async () => {
    testEnv.NODE_ENV = "production"
    delete process.env.JWT_SECRET

    await expect(import("@/lib/auth/jwt")).rejects.toThrow(
      /JWT_SECRET must be set in production/,
    )
  })

  it("imports cleanly in production when JWT_SECRET is set", async () => {
    testEnv.NODE_ENV = "production"
    testEnv.JWT_SECRET = "a-production-secret-at-least-32-chars"

    const mod = await import("@/lib/auth/jwt")
    const token = await mod.signToken({
      sub: "user-1",
      email: "user@example.com",
      role: "admin",
    })
    await expect(mod.verifyToken(token)).resolves.toMatchObject({
      sub: "user-1",
    })
  })

  it("imports cleanly outside production without JWT_SECRET (dev fallback)", async () => {
    testEnv.NODE_ENV = "test"
    delete testEnv.JWT_SECRET

    const mod = await import("@/lib/auth/jwt")
    const token = await mod.signToken({
      sub: "user-2",
      email: "dev@example.com",
      role: "designer",
    })
    await expect(mod.verifyToken(token)).resolves.toMatchObject({
      sub: "user-2",
    })
  })
})
