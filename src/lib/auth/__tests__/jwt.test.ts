import { beforeAll, describe, expect, it } from "vitest"
import { decodeToken, signToken, verifyToken } from "../jwt"

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-for-unit-tests"
})

describe("JWT", () => {
  const payload = {
    sub: "11111111-1111-1111-1111-111111111111",
    email: "test@example.com",
    role: "admin" as const,
    name: "Test User",
  }

  describe("signToken", () => {
    it("should return a string token", async () => {
      const token = await signToken(payload)
      // oxlint-disable-next-line anti-slop/no-runtime-typeof  // test assertion on produced token
      expect(typeof token).toBe("string")
      expect(token.split(".")).toHaveLength(3)
    })
  })

  describe("verifyToken", () => {
    it("should verify a valid token", async () => {
      const token = await signToken(payload)
      const decoded = await verifyToken(token)
      expect(decoded).not.toBeNull()
      expect(decoded?.sub).toBe(payload.sub)
      expect(decoded?.email).toBe(payload.email)
      expect(decoded?.role).toBe(payload.role)
      expect(decoded?.name).toBe(payload.name)
    })

    it("should return null for invalid token", async () => {
      const result = await verifyToken("invalid-token")
      expect(result).toBeNull()
    })

    it("should return null for tampered token", async () => {
      const token = await signToken(payload)
      const tampered = `${token.slice(0, -5)}XXXXX`
      const result = await verifyToken(tampered)
      expect(result).toBeNull()
    })
  })

  describe("decodeToken", () => {
    it("should decode without verification", async () => {
      const token = await signToken(payload)
      const decoded = decodeToken(token)
      expect(decoded).not.toBeNull()
      expect(decoded?.sub).toBe(payload.sub)
    })

    it("should return null for malformed token", () => {
      const result = decodeToken("not-a-jwt")
      expect(result).toBeNull()
    })
  })
})
