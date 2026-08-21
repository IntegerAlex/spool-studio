import { createHash, randomUUID } from "node:crypto"

export interface PortalTokenPair {
  raw: string
  hashed: string
}

export function hashPortalToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

export function generatePortalToken(): PortalTokenPair {
  const raw = randomUUID()
  return { raw, hashed: hashPortalToken(raw) }
}
