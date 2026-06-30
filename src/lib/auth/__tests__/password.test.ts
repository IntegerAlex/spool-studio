import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../password';

describe('Password', () => {
  describe('hashPassword', () => {
    it('should return a bcrypt hash', async () => {
      const hash = await hashPassword('TestPassword123!');
      expect(hash).toMatch(/^\$2[aby]?\$/);
      expect(hash).not.toBe('TestPassword123!');
    });

    it('should produce different hashes for same input', async () => {
      const hash1 = await hashPassword('same-password');
      const hash2 = await hashPassword('same-password');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const hash = await hashPassword('MySecurePass!');
      const result = await verifyPassword('MySecurePass!', hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hash = await hashPassword('MySecurePass!');
      const result = await verifyPassword('WrongPassword!', hash);
      expect(result).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await hashPassword('SomePassword');
      const result = await verifyPassword('', hash);
      expect(result).toBe(false);
    });
  });
});
