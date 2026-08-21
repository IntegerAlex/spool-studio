import { ApiError } from "@/lib/api-error"
import { cache } from "react"
import { verifyToken } from "./jwt"
import { SESSION_COOKIE_NAME, validateSession } from "./session"
import type { AuthUser } from "./types"

export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  return validateSession()
})

/**
 * API-boundary auth: throws 401 instead of returning null so route handlers
 * never need an `if (!user)` guard. Server components should use
 * getCurrentUser() + redirect() themselves.
 */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw ApiError.unauthorized()
  }
  return user
}

export async function getUserFromRequest(cookies: {
  get: (name: string) => { value: string } | undefined
}): Promise<AuthUser | null> {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    role: payload.role,
    avatarUrl: null,
  }
}
