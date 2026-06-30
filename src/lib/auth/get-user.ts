import { redirect } from 'next/navigation';
import { validateSession, SESSION_COOKIE_NAME } from './session';
import { verifyToken } from './jwt';
import type { AuthUser } from './types';

export async function getCurrentUser(): Promise<AuthUser | null> {
  return validateSession();
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function getUserFromRequest(
  cookies: { get: (name: string) => { value: string } | undefined }
): Promise<AuthUser | null> {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    role: payload.role,
    avatarUrl: null,
  };
}
