import { requireUser, getCurrentUser } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

export type Permission =
  | 'assets:create' | 'assets:read' | 'assets:update' | 'assets:delete' | 'assets:approve'
  | 'clients:create' | 'clients:read' | 'clients:update' | 'clients:delete'
  | 'comments:create' | 'comments:read' | 'comments:delete'
  | 'team:read' | 'team:invite' | 'team:remove'
  | 'settings:read' | 'settings:update'
  | 'notifications:read' | 'notifications:manage'
  | 'queue:read' | 'queue:manage'
  | 'logs:read'
  | 'reports:read' | 'reports:create';

const ALL_PERMISSIONS: Permission[] = [
  'assets:create', 'assets:read', 'assets:update', 'assets:delete', 'assets:approve',
  'clients:create', 'clients:read', 'clients:update', 'clients:delete',
  'comments:create', 'comments:read', 'comments:delete',
  'team:read', 'team:invite', 'team:remove',
  'settings:read', 'settings:update',
  'notifications:read', 'notifications:manage',
  'queue:read', 'queue:manage',
  'logs:read',
  'reports:read', 'reports:create',
];

const rolePermissions: Record<string, Permission[]> = {
  admin: ALL_PERMISSIONS,
  designer: [
    'assets:create', 'assets:read', 'assets:update',
    'clients:read',
    'comments:create', 'comments:read',
    'notifications:read',
    'queue:read',
    'logs:read',
    'reports:read',
  ],
  approver: [
    'assets:read', 'assets:approve',
    'clients:read',
    'comments:create', 'comments:read',
    'notifications:read',
    'queue:read',
    'logs:read',
    'reports:read', 'reports:create',
  ],
  uploader: [
    'assets:create', 'assets:read',
    'clients:read',
    'comments:read',
    'queue:read', 'queue:manage',
  ],
};

export function getPermissionsForRole(role: string): Permission[] {
  return rolePermissions[role] ?? [];
}

export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = rolePermissions[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export async function requirePermission(permission: Permission): Promise<AuthUser> {
  const user = await requireUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  if (!hasPermission(user.role, permission)) {
    throw new Error(`Permission denied: ${permission} requires a role with sufficient privileges`);
  }
  return user;
}
