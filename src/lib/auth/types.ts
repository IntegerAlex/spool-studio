import type { UserRole } from '@/types/index';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  name?: string;
  iat?: number;
  exp?: number;
}

export interface Session {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    avatarUrl: string | null;
  };
  token: string;
  expiresAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  avatarUrl: string | null;
}
