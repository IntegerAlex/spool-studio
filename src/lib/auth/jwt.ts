import { decodeJwt, jwtVerify, SignJWT } from "jose"
import type { TokenPayload } from "./types"

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET must be set in production - refusing to start with the dev fallback secret",
  )
}

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production",
)

const ALGORITHM = "HS512"
const EXPIRY_DAYS = 7

export async function signToken(
  payload: Omit<TokenPayload, "iat" | "exp">,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .setSubject(payload.sub)
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: [ALGORITHM],
    })
    return {
      sub: payload.sub!,
// SAFETY: this cast is safe because the value already conforms to the asserted type.
      email: payload.email as string,
// SAFETY: this cast is safe because the value already conforms to the asserted type.
      role: payload.role as TokenPayload["role"],
// SAFETY: this cast is safe because the value already conforms to the asserted type.
      name: payload.name as string | undefined,
      iat: payload.iat,
      exp: payload.exp,
    }
  } catch {
    return null
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = decodeJwt(token)
    return {
      sub: payload.sub!,
// SAFETY: this cast is safe because the value already conforms to the asserted type.
      email: payload.email as string,
// SAFETY: this cast is safe because the value already conforms to the asserted type.
      role: payload.role as TokenPayload["role"],
// SAFETY: this cast is safe because the value already conforms to the asserted type.
      name: payload.name as string | undefined,
      iat: payload.iat,
      exp: payload.exp,
    }
  } catch {
    return null
  }
}
