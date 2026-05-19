import { mockUsers, mockClients, mockAssets, mockNotifications, mockUploadQueue, mockWorkspace } from './mock-data';
import type { User, Client, Asset, Notification, UploadQueue, Workspace } from '@/types/index';

// Simulate network delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    await delay(500);
    const user = mockUsers.find(u => u.email === email);
    if (!user) throw new Error('User not found');
    return { user, token: 'mock-jwt-token-' + user.id };
  },

  logout: async (): Promise<void> => {
    await delay(200);
  },

  getCurrentUser: async (): Promise<User | null> => {
    await delay(200);
    return mockUsers[0] || null;
  },

  forgotPassword: async (email: string): Promise<void> => {
    await delay(400);
    if (!mockUsers.find(u => u.email === email)) {
      throw new Error('User not found');
    }
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await delay(400);
  },
};

// Clients API
export const clientsApi = {
  getAll: async (): Promise<Client[]> => {
    await delay();
    return mockClients;
  },

  getById: async (id: string): Promise<Client | null> => {
    await delay();
    return mockClients.find(c => c.id === id) || null;
  },

  create: async (client: Omit<Client, 'id'>): Promise<Client> => {
    await delay(400);
    const newClient: Client = { ...client, id: `client_${Date.now()}` };
    return newClient;
  },

  update: async (id: string, updates: Partial<Client>): Promise<Client> => {
    await delay(400);
    const client = mockClients.find(c => c.id === id);
    if (!client) throw new Error('Client not found');
    return { ...client, ...updates };
  },

  delete: async (id: string): Promise<void> => {
    await delay(300);
  },
};

// Assets API
export const assetsApi = {
  getAll: async (): Promise<Asset[]> => {
    await delay();
    return mockAssets;
  },

  getByClientId: async (clientId: string): Promise<Asset[]> => {
    await delay();
    return mockAssets.filter(a => a.clientId === clientId);
  },

  getById: async (id: string): Promise<Asset | null> => {
    await delay();
    return mockAssets.find(a => a.id === id) || null;
  },

  create: async (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> => {
    await delay(400);
    const newAsset: Asset = {
      ...asset,
      id: `asset_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return newAsset;
  },

  update: async (id: string, updates: Partial<Asset>): Promise<Asset> => {
    await delay(400);
    const asset = mockAssets.find(a => a.id === id);
    if (!asset) throw new Error('Asset not found');
    return { ...asset, ...updates, updatedAt: new Date() };
  },

  updateStatus: async (id: string, status: Asset['status']): Promise<Asset> => {
    await delay(300);
    const asset = mockAssets.find(a => a.id === id);
    if (!asset) throw new Error('Asset not found');
    return { ...asset, status, updatedAt: new Date() };
  },

  delete: async (id: string): Promise<void> => {
    await delay(300);
  },

  addComment: async (assetId: string, comment: string, isInternal: boolean = false): Promise<Asset> => {
    await delay(300);
    const asset = mockAssets.find(a => a.id === assetId);
    if (!asset) throw new Error('Asset not found');
    return {
      ...asset,
      comments: [
        ...asset.comments,
        {
          id: `comment_${Date.now()}`,
          assetId,
          authorId: 'user_1',
          content: comment,
          createdAt: new Date(),
          replies: [],
          isInternal,
        },
      ],
    };
  },

  requestRevision: async (assetId: string, reason: string): Promise<Asset> => {
    await delay(300);
    const asset = mockAssets.find(a => a.id === assetId);
    if (!asset) throw new Error('Asset not found');
    return {
      ...asset,
      status: 'revision_requested',
      revisions: [
        ...asset.revisions,
        {
          id: `rev_${Date.now()}`,
          assetId,
          version: asset.revisions.length + 1,
          createdBy: 'user_1',
          createdAt: new Date(),
          reason,
        },
      ],
    };
  },
};

// Notifications API
export const notificationsApi = {
  getAll: async (userId?: string): Promise<Notification[]> => {
    await delay();
    if (userId) {
      return mockNotifications.filter(n => n.userId === userId);
    }
    return mockNotifications;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    await delay(200);
    const notification = mockNotifications.find(n => n.id === id);
    if (!notification) throw new Error('Notification not found');
    return { ...notification, read: true };
  },

  markAllAsRead: async (userId: string): Promise<void> => {
    await delay(300);
  },

  delete: async (id: string): Promise<void> => {
    await delay(200);
  },
};

// Upload Queue API
export const queueApi = {
  getAll: async (): Promise<UploadQueue[]> => {
    await delay();
    return mockUploadQueue;
  },

  getById: async (id: string): Promise<UploadQueue | null> => {
    await delay();
    return mockUploadQueue.find(q => q.id === id) || null;
  },

  create: async (queue: Omit<UploadQueue, 'id'>): Promise<UploadQueue> => {
    await delay(400);
    return { ...queue, id: `queue_${Date.now()}` };
  },

  update: async (id: string, updates: Partial<UploadQueue>): Promise<UploadQueue> => {
    await delay(300);
    const queue = mockUploadQueue.find(q => q.id === id);
    if (!queue) throw new Error('Queue item not found');
    return { ...queue, ...updates };
  },

  delete: async (id: string): Promise<void> => {
    await delay(200);
  },
};

// Users API
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    await delay();
    return mockUsers;
  },

  getById: async (id: string): Promise<User | null> => {
    await delay();
    return mockUsers.find(u => u.id === id) || null;
  },
};

// Workspace API
export const workspaceApi = {
  get: async (): Promise<Workspace> => {
    await delay();
    return mockWorkspace;
  },

  update: async (updates: Partial<Workspace>): Promise<Workspace> => {
    await delay(400);
    return { ...mockWorkspace, ...updates };
  },
};
