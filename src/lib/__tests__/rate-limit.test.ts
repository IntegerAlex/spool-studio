import { describe, expect, it } from "vitest"
import { ApiError, jsonError } from "@/lib/api-error"
import { rateLimit, requestIp } from "@/src/lib/rate-limit"

describe("rateLimit", () => {
  it("allows up to limit calls within the window", () => {
    const key = "test-key-allows"
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, { limit: 3, windowMs: 60_000 })).toMatchObject({
        ok: true,
        retryAfterSeconds: 0,
      })
    }
  })

  it("blocks call limit+1 with ok:false and a positive retryAfterSeconds", () => {
    const key = "test-key-blocks"
    for (let i = 0; i < 3; i++) {
      rateLimit(key, { limit: 3, windowMs: 60_000 })
    }
    const blocked = rateLimit(key, { limit: 3, windowMs: 60_000 })
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it("isolates different keys", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("key-a", { limit: 5, windowMs: 60_000 })
    }
    expect(
      rateLimit("key-b", { limit: 5, windowMs: 60_000 }).ok,
    ).toBe(true)
  })

  it("restores access after the window expires", async () => {
    const key = "test-key-expiry"
    for (let i = 0; i < 2; i++) {
      rateLimit(key, { limit: 1, windowMs: 20 })
      await new Promise((r) => setTimeout(r, 25))
    }
    expect(rateLimit(key, { limit: 1, windowMs: 20 }).ok).toBe(true)
  })
})

describe("requestIp", () => {
  it("uses the first hop of x-forwarded-for", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    })
    expect(requestIp(request)).toBe("203.0.113.7")
  })

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const request = new Request("https://example.com", {
      headers: { "x-real-ip": "198.51.100.9" },
    })
    expect(requestIp(request)).toBe("198.51.100.9")
  })

  it('defaults to "unknown" when neither header is present', () => {
    const request = new Request("https://example.com")
    expect(requestIp(request)).toBe("unknown")
  })
})

describe("Retry-After serialization via jsonError", () => {
  it("emits a 429 response with a retry-after header", () => {
    const response = jsonError(ApiError.tooManyRequests(42))
    expect(response.status).toBe(429)
    expect(response.headers.get("retry-after")).toBe("42")
  })
})
