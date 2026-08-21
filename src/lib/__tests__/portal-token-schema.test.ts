import { describe, expect, it } from "vitest"
import { z } from "zod"

// Mirrors the schema in app/api/portal/token/route.ts POST. Kept in sync
// manually; the route has no exported pure mapper to import directly.
const PortalTokenSchema = z.object({
  clientId: z.string().uuid("clientId must be a valid id"),
  expiresInDays: z.number().int().min(1).max(365).default(30),
})

const VALID_CLIENT_ID = "a888832a-a9c2-4e9b-90f4-836668b4f73f"

describe("portal token creation schema (B5 bounds)", () => {
  // oxlint-disable-next-line anti-slop/no-unknown-parameters  // test helper: schema.safeParse accepts arbitrary candidate payloads
  const parse = (body: unknown) => PortalTokenSchema.safeParse(body)

  it("accepts a valid clientId and applies the 30-day default", () => {
    const result = parse({ clientId: VALID_CLIENT_ID })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expiresInDays).toBe(30)
    }
  })

  it("accepts explicit expiresInDays within bounds", () => {
    expect(parse({ clientId: VALID_CLIENT_ID, expiresInDays: 1 }).success).toBe(
      true,
    )
    expect(
      parse({ clientId: VALID_CLIENT_ID, expiresInDays: 365 }).success,
    ).toBe(true)
  })

  it("rejects negative expiresInDays (instantly-expired tokens)", () => {
    expect(parse({ clientId: VALID_CLIENT_ID, expiresInDays: -1 }).success).toBe(
      false,
    )
    expect(parse({ clientId: VALID_CLIENT_ID, expiresInDays: 0 }).success).toBe(
      false,
    )
  })

  it("rejects huge expiresInDays (multi-decade tokens)", () => {
    expect(
      parse({ clientId: VALID_CLIENT_ID, expiresInDays: 3650 }).success,
    ).toBe(false)
    expect(
      parse({ clientId: VALID_CLIENT_ID, expiresInDays: 36500 }).success,
    ).toBe(false)
  })

  it("rejects non-integer and non-number expiresInDays", () => {
    expect(
      parse({ clientId: VALID_CLIENT_ID, expiresInDays: 30.5 }).success,
    ).toBe(false)
    expect(
      parse({ clientId: VALID_CLIENT_ID, expiresInDays: "30" }).success,
    ).toBe(false)
  })

  it("rejects malformed clientId", () => {
    expect(parse({ clientId: "not-a-uuid" }).success).toBe(false)
    expect(parse({}).success).toBe(false)
  })
})
