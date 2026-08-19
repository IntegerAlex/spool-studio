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

export async function createSession(user: AuthUser) {
  const token = await signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name ?? undefined,
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
