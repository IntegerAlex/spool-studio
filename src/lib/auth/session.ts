import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { signToken, verifyToken } from "./jwt"
import type { AuthUser } from "./types"

export const SESSION_COOKIE_NAME = "cms_session"

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

type CookieOptions = {
  httpOnly: boolean
  secure: boolean
  sameSite: "lax" | "strict" | "none"
  path: string
  maxAge: number
}

type SessionCookie = {
  name: string
  value: string
  options: CookieOptions
}

function getCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  }
}

export async function createSession(
  user: AuthUser,
  tokenVersion = 0,
) {
  const token = await signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name ?? undefined,
    ver: tokenVersion,
  })

  return {
    token,
    cookie: {
      name: SESSION_COOKIE_NAME,
      value: token,
      options: getCookieOptions(),
    },
  }
}

function isDeadSocket(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    msg.includes("Connection terminated") ||
    msg.includes("Connection ended") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ENOTFOUND")
  )
}

async function queryWithReconnect<T>(query: () => Promise<T>): Promise<T> {
  try {
    return await query()
  } catch (error) {
    if (!isDeadSocket(error)) throw error
    console.warn("[db] dead socket, retrying once")
    return await query()
  }
}

export async function validateSession(cookieStore?: {
  get: (name: string) => { value: string } | undefined
}): Promise<AuthUser | null> {
  let token: string | undefined

  if (cookieStore) {
    token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  } else {
    const { cookies } = await import("next/headers")
    const store = await cookies()
    token = store.get(SESSION_COOKIE_NAME)?.value
  }

  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  // Revocation check: the token must carry the user's current token_version.
  // Also rejects tokens for deleted users. Tokens issued before the
  // token_version column existed carry no ver, treated as 0 (the default).
  // ponytail: one retry for Neon's dead-socket race; per-query retry wrapper
  // if other hot paths ever show the same flake
  const rows = await queryWithReconnect(() =>
    db
      .select({ tokenVersion: users.token_version })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1),
  )
  const row = rows[0]
  if (!row) return null
  if ((payload.ver ?? 0) !== row.tokenVersion) return null

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    role: payload.role,
    avatarUrl: null,
  }
}

export function destroySession(): SessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    },
  }
}
