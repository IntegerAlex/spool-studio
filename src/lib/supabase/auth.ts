// Re-export custom auth for backwards compatibility
// New code should import from '@/lib/auth' directly
export { getCurrentUser as getUser, requireUser, validateSession as getSession } from '@/lib/auth';
