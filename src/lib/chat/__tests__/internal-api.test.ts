import { describe, expect, it } from "vitest"
import { ApiError } from "@/lib/api-error"
import { AccessDeniedError, callInternalApi } from "../internal-api"

const COOKIE = "cms_session=abc.def.ghi"

describe("AccessDeniedError", () => {
  it("is a typed, user-facing error", () => {
    const err = new AccessDeniedError()
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe("AccessDeniedError")
    expect(err.message).toContain("access")
  })
})

describe("callInternalApi path safety", () => {
  it("rejects attempts to reach an arbitrary full URL", async () => {
    await expect(
      callInternalApi("https://evil.example.com/api/assets", { cookieHeader: COOKIE }),
    ).rejects.toThrow(/must start with/)
  })

  it("rejects protocol-relative paths", async () => {
    await expect(
      callInternalApi("//evil.example.com/api/assets", { cookieHeader: COOKIE }),
    ).rejects.toThrow()
  })

  it("rejects paths that are not allow-listed local API routes", async () => {
    await expect(
      callInternalApi("/dashboard", { cookieHeader: COOKIE }),
    ).rejects.toThrow(/not allow-listed/)
    await expect(
      callInternalApi("/admin/purge", { cookieHeader: COOKIE }),
    ).rejects.toThrow(/not allow-listed/)
  })

  it("rejects when no session cookie is forwarded", async () => {
    await expect(
      callInternalApi("/api/assets", { cookieHeader: "" }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})
