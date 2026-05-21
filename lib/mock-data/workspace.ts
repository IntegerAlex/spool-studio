import type { Workspace } from '@/types/index';

export const mockWorkspace: Workspace = {
  id: 'workspace_1',
  name: 'Creative Agency Hub',
  members: [
    { id: 'tm_1', userId: 'user_1', workspaceId: 'workspace_1', role: 'admin', joinedAt: new Date('2024-01-01') },
    { id: 'tm_2', userId: 'user_2', workspaceId: 'workspace_1', role: 'approver', joinedAt: new Date('2024-01-15') },
    { id: 'tm_3', userId: 'user_3', workspaceId: 'workspace_1', role: 'designer', joinedAt: new Date('2024-02-01') },
    { id: 'tm_4', userId: 'user_4', workspaceId: 'workspace_1', role: 'designer', joinedAt: new Date('2024-02-10') },
  ],
  createdAt: new Date('2024-01-01'),
};