import { describe, expect, it } from "vitest"
import { ApiError, jsonError, readJsonBody } from "@/lib/api-error"

describe("jsonError with ApiError", () => {
  it("passes through status and message for a 404", async () => {
    const res = jsonError(new ApiError("Not found", 404))
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Not found",
      issues: [],
    })
  })

  it("includes issues in the body when present", async () => {
    const issues = [{ path: "email", message: "Invalid email" }]
    const res = jsonError(new ApiError("Bad request", 400, issues))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe("Bad request")
    expect(body.issues).toEqual(issues)
  })
})

describe("jsonError with unknown errors", () => {
  it("sanitizes non-ApiError to a generic 500", async () => {
    const res = jsonError(new Error("secret db detail"))
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Internal server error",
    })
  })
})

describe("ApiError helpers", () => {
  it("unauthorized defaults to 401", () => {
    const err = ApiError.unauthorized()
    expect(err.status).toBe(401)
    expect(err.message).toBe("Unauthorized")
  })

  it("forbidden defaults to 403", () => {
    const err = ApiError.forbidden()
    expect(err.status).toBe(403)
    expect(err.message).toBe("Forbidden")
  })

  it("badRequest defaults to 400 and carries issues", () => {
    const issues = [{ path: "name", message: "Required" }]
    const err = ApiError.badRequest(undefined, issues)
    expect(err.status).toBe(400)
    expect(err.message).toBe("Bad request")
    expect(err.issues).toEqual(issues)
  })

  it("notFound defaults to 404", () => {
    const err = ApiError.notFound()
    expect(err.status).toBe(404)
    expect(err.message).toBe("Not found")
  })

  it("helpers accept custom messages", () => {
    expect(ApiError.unauthorized("Token expired").message).toBe(
      "Token expired",
    )
    expect(ApiError.forbidden("No access").status).toBe(403)
    expect(ApiError.notFound("Missing widget").message).toBe("Missing widget")
  })
})

describe("readJsonBody", () => {
  it("parses a valid JSON body", async () => {
    const request = new Request("http://localhost/test", {
      method: "POST",
      body: JSON.stringify({ name: "test", count: 2 }),
      headers: { "content-type": "application/json" },
    })
    await expect(readJsonBody(request)).resolves.toEqual({
      name: "test",
      count: 2,
    })
  })

  it("rejects malformed JSON with a 400 ApiError", async () => {
    const request = new Request("http://localhost/test", {
      method: "POST",
      body: "{not json",
    })
    await expect(readJsonBody(request)).rejects.toMatchObject({
      status: 400,
      message: "Invalid JSON body",
    })
  })
})
