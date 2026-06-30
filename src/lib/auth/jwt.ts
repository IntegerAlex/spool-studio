import { SignJWT, jwtVerify, decodeJwt } from 'jose';
import type { TokenPayload } from './types';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
);

const ALGORITHM = 'HS512';
const EXPIRY_DAYS = 7;

export async function signToken(
  payload: Omit<TokenPayload, 'iat' | 'exp'>
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .setSubject(payload.sub)
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: [ALGORITHM],
    });
    return {
      sub: payload.sub!,
      email: payload.email as string,
      role: payload.role as TokenPayload['role'],
      name: payload.name as string | undefined,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = decodeJwt(token);
    return {
      sub: payload.sub!,
      email: payload.email as string,
      role: payload.role as TokenPayload['role'],
      name: payload.name as string | undefined,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
