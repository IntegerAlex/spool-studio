import type { UserRole } from "@/types/index"

export interface TokenPayload {
  sub: string
  email: string
  role: UserRole
  name?: string
  /**
   * Token version matching users.token_version at issue time. validateSession
   * rejects tokens whose ver is stale (e.g. issued before a password change).
   * Absent ver is treated as 0 for tokens issued before the column existed.
   */
  ver?: number
  iat?: number
  exp?: number
}

export interface Session {
  user: {
    id: string
    email: string
    name: string | null
    role: UserRole
    avatarUrl: string | null
  }
  token: string
  expiresAt: Date
}

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  avatarUrl: string | null
}
