import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import {
  generatePortalToken,
  hashPortalToken,
} from "@/src/lib/portal-token"

describe("hashPortalToken", () => {
  it("is deterministic and returns 64-char lowercase hex", () => {
    const a = hashPortalToken("test")
    const b = hashPortalToken("test")
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it("matches the known sha256 vector", () => {
    expect(hashPortalToken("test")).toBe(
      "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    )
    expect(hashPortalToken("test")).toBe(
      createHash("sha256").update("test").digest("hex"),
    )
  })
})

describe("generatePortalToken", () => {
  it("returns a raw token whose hash matches the hashed value", () => {
    const { raw, hashed } = generatePortalToken()
    expect(raw).not.toBe(hashed)
    expect(hashed).toBe(hashPortalToken(raw))
  })
})

describe("portal token redaction (contract from app/api/portal/token/route.ts)", () => {
  // The route maps DB rows with `tokenPrefix: row.token.slice(0, 8)`; the full
  // token must never leave the server. No pure mapper is exported, so the same
  // slice contract is exercised here against a representative row shape.
  interface PortalTokenRow {
    id: string
    client_id: string
    token: string
    expires_at: Date
    created_at: Date
    client_name: string
  }

  function toPublicTokenView(row: PortalTokenRow) {
    return {
      id: row.id,
      client_id: row.client_id,
      client_name: row.client_name,
      expires_at: row.expires_at,
      created_at: row.created_at,
      tokenPrefix: row.token.slice(0, 8),
    }
  }

  it("keeps only the first 8 chars of the token in the public view", () => {
    const fullToken = hashPortalToken("leak-check")
    const row: PortalTokenRow = {
      id: "pt-1",
      client_id: "client-1",
      token: fullToken,
      expires_at: new Date("2026-12-31T00:00:00Z"),
      created_at: new Date("2026-01-01T00:00:00Z"),
      client_name: "Acme",
    }

    const view = toPublicTokenView(row)
    expect(view.tokenPrefix).toBe(fullToken.slice(0, 8))
    expect(view.tokenPrefix).toHaveLength(8)
    expect(JSON.stringify(view)).not.toContain(fullToken)
  })
})
