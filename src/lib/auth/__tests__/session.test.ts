import { describe, it, expect, beforeAll } from 'vitest';
import { createSession, destroySession, SESSION_COOKIE_NAME } from '../session';
import type { AuthUser } from '../types';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';
});

describe('Session', () => {
  const mockUser: AuthUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    avatarUrl: null,
  };

  describe('createSession', () => {
    it('should return token and cookie config', async () => {
      const result = await createSession(mockUser);
      expect(result.token).toBeTruthy();
      expect(result.cookie.name).toBe(SESSION_COOKIE_NAME);
      expect(result.cookie.value).toBeTruthy();
      expect(result.cookie.options).toHaveProperty('httpOnly');
      expect(result.cookie.options).toHaveProperty('path');
    });

    it('should set httpOnly to true', async () => {
      const result = await createSession(mockUser);
      expect(result.cookie.options.httpOnly).toBe(true);
    });
  });

  describe('destroySession', () => {
    it('should return cookie deletion config', () => {
      const result = destroySession();
      expect(result.name).toBe(SESSION_COOKIE_NAME);
      expect(result.value).toBe('');
    });
  });
});
