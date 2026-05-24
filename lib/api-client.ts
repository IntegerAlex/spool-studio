import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { mockNotifications } from './mock-data/notifications';
import { mockUploadQueue } from './mock-data/upload-queue';
import { mockWorkspace } from './mock-data/workspace';
import type {
  Asset,
  AssetComment,
  Client,
  Notification,
  UploadQueue,
  User,
  Workspace,
} from '@/types/index';

interface ApiEnvelope<T> {
  data?: T;
  error?: string;
}

type UploadPhase = 'requesting-session' | 'uploading' | 'finalizing';

export interface UploadProgressUpdate {
  phase: UploadPhase;
  percentage: number;
}

export interface UploadFileOptions {
  onProgress?: (update: UploadProgressUpdate) => void;
}

const pendingRequests = new Map<string, Promise<unknown>>();

function buildRequestKey(input: RequestInfo, init?: RequestInit): string {
  const requestUrl = typeof input === 'string' ? input : String(input);
  const method = init?.method ?? 'GET';
  const body = typeof init?.body === 'string' ? init.body : '';

  return `${method}:${requestUrl}:${body}`;
}

async function dedupeRequest<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const pending = pendingRequests.get(key) as Promise<T> | undefined;
  if (pending) {
    return pending;
  }

  const request = loader().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, request as Promise<unknown>);
  return request;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json()) as ApiEnvelope<T>;
    throw new Error(payload.error ?? 'Request failed');
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (payload.error) {
    throw new Error(payload.error);
  }
  return payload.data as T;
}

async function fetchJsonDeduped<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  return dedupeRequest(buildRequestKey(input, init), () => fetchJson<T>(input, init));
}

async function fetchJsonNullable<T>(input: RequestInfo): Promise<T | null> {
  const response = await fetch(input, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const payload = (await response.json()) as ApiEnvelope<T>;
    throw new Error(payload.error ?? 'Request failed');
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (payload.error) {
    throw new Error(payload.error);
  }
  return payload.data as T;
}

async function fetchJsonNullableDeduped<T>(input: RequestInfo): Promise<T | null> {
  return dedupeRequest(buildRequestKey(input), () => fetchJsonNullable<T>(input));
}

function emitUploadProgress(
  onProgress: ((update: UploadProgressUpdate) => void) | undefined,
  phase: UploadPhase,
  percentage: number
) {
  onProgress?.({ phase, percentage: Math.max(0, Math.min(100, Math.round(percentage))) });
}

async function uploadFileToDriveSession(
  uploadUrl: string,
  file: File,
  assetId: string,
  onProgress?: (update: UploadProgressUpdate) => void
): Promise<void> {
  let simulatedProgress = 12;
  let timer: ReturnType<typeof globalThis.setInterval> | null = null;

  if (onProgress) {
    emitUploadProgress(onProgress, 'uploading', simulatedProgress);
    timer = globalThis.setInterval(() => {
      simulatedProgress = Math.min(simulatedProgress + Math.max(1, Math.round(file.size / (8 * 1024 * 1024))) + 1, 94);
      emitUploadProgress(onProgress, 'uploading', simulatedProgress);
    }, 300);
  }

  try {
    await fetch(uploadUrl, {
      method: 'PUT',
      mode: 'no-cors',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    });

    console.info('[google-upload-success]', {
      status: 0,
      assetId,
      finalized: true,
    });
  } finally {
    if (timer) {
      globalThis.clearInterval(timer);
    }
  }
}

function hydrateAsset(asset: Asset): Asset {
  return {
    ...asset,
    createdAt: new Date(asset.createdAt),
    updatedAt: new Date(asset.updatedAt),
    uploadedAt: asset.uploadedAt ? new Date(asset.uploadedAt) : null,
    scheduledAt: asset.scheduledAt ? new Date(asset.scheduledAt) : null,
  };
}

function hydrateUser(user: User): User {
  return {
    ...user,
    createdAt: new Date(user.createdAt),
  };
}

function hydrateComment(comment: AssetComment): AssetComment {
  return {
    ...comment,
    createdAt: new Date(comment.createdAt),
    updatedAt: new Date(comment.updatedAt),
  };
}

export const authApi = {
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      throw new Error(error?.message ?? 'Login failed');
    }

    const profile = await fetchJson<User>('/api/users/me');
    return { user: hydrateUser(profile), token: data.session.access_token };
  },

  logout: async (): Promise<void> => {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    const user = await fetchJsonNullableDeduped<User>('/api/users/me');
    return user ? hydrateUser(user) : null;
  },

  forgotPassword: async (email: string): Promise<void> => {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      throw new Error(error.message);
    }
  },

  resetPassword: async (_token: string, newPassword: string): Promise<void> => {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw new Error(error.message);
    }
  },
};

export const clientsApi = {
  getAll: async (): Promise<Client[]> => {
    return fetchJsonDeduped<Client[]>('/api/clients');
  },

  getById: async (id: string): Promise<Client | null> => {
    return fetchJsonNullableDeduped<Client>(`/api/clients/${id}`);
  },

  create: async (client: {
    name: string;
    slug: string;
    instagramHandle?: string;
    brandColor?: string;
    monthlyReelsTarget?: number;
    monthlyPostsTarget?: number;
  }): Promise<Client> => {
    return fetchJson<Client>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    });
  },

  update: async (
    id: string,
    updates: Partial<{
      name: string;
      slug: string;
      instagramHandle?: string;
      brandColor?: string;
      monthlyReelsTarget?: number;
      monthlyPostsTarget?: number;
    }>
  ): Promise<Client> => {
    return fetchJson<Client>(`/api/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  delete: async (id: string): Promise<void> => {
    await fetchJson(`/api/clients/${id}`, { method: 'DELETE' });
  },
};

export const assetsApi = {
  getAll: async (): Promise<Asset[]> => {
    const assets = await fetchJsonDeduped<Asset[]>('/api/assets');
    return assets.map(hydrateAsset);
  },

  getByClientId: async (clientId: string): Promise<Asset[]> => {
    const assets = await fetchJsonDeduped<Asset[]>(
      `/api/assets?clientId=${encodeURIComponent(clientId)}`
    );
    return assets.map(hydrateAsset);
  },

  getById: async (id: string): Promise<Asset | null> => {
    const asset = await fetchJsonNullableDeduped<Asset>(`/api/assets/${id}`);
    return asset ? hydrateAsset(asset) : null;
  },

  create: async (asset: {
    clientId: string;
    title: string;
    type: Asset['type'];
    status?: Asset['status'];
    driveFileUrl?: string;
    thumbnailUrl?: string;
    assignedTo?: string | null;
    scheduledAt?: string | null;
  }): Promise<Asset> => {
    const created = await fetchJson<Asset>('/api/assets', {
      method: 'POST',
      body: JSON.stringify(asset),
    });
    return hydrateAsset(created);
  },

  uploadFile: async (assetId: string, file: File, options?: UploadFileOptions): Promise<Asset> => {
    emitUploadProgress(options?.onProgress, 'requesting-session', 0);

    const session = await fetchJson<{ uploadUrl: string; driveFileId: string }>(`/api/uploads/google-session`, {
      method: 'POST',
      body: JSON.stringify({
        assetId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
      }),
    });

    emitUploadProgress(options?.onProgress, 'uploading', 15);
    await uploadFileToDriveSession(session.uploadUrl, file, assetId, options?.onProgress);

    emitUploadProgress(options?.onProgress, 'finalizing', 96);

    const payload = await fetchJson<{ asset: Asset; upload: unknown }>(`/api/assets/${assetId}/upload`, {
      method: 'POST',
      body: JSON.stringify({
        driveFileId: session.driveFileId,
        fileName: file.name,
      }),
    });

    emitUploadProgress(options?.onProgress, 'finalizing', 100);
    return hydrateAsset(payload.asset);
  },

  update: async (
    id: string,
    updates: Partial<{
      clientId: string;
      title: string;
      type: Asset['type'];
      status: Asset['status'];
      driveFileUrl?: string;
      thumbnailUrl?: string;
      assignedTo?: string | null;
      scheduledAt?: string | null;
    }>
  ): Promise<Asset> => {
    const updated = await fetchJson<Asset>(`/api/assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return hydrateAsset(updated);
  },

  delete: async (id: string): Promise<void> => {
    await fetchJson(`/api/assets/${id}`, { method: 'DELETE' });
  },
};

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const users = await fetchJsonDeduped<User[]>('/api/users');
    return users.map(hydrateUser);
  },

  getById: async (id: string): Promise<User | null> => {
    const user = await fetchJsonNullableDeduped<User>(`/api/users/${id}`);
    return user ? hydrateUser(user) : null;
  },
};

export const commentsApi = {
  getByAssetId: async (assetId: string): Promise<AssetComment[]> => {
    const comments = await fetchJson<AssetComment[]>(`/api/assets/${assetId}/comments`);
    return comments.map(hydrateComment);
  },

  create: async (
    assetId: string,
    input: {
      message: string;
      isInternal?: boolean;
    }
  ): Promise<AssetComment> => {
    const created = await fetchJson<AssetComment>(`/api/assets/${assetId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        message: input.message,
        type: input.isInternal ? 'internal_note' : 'comment',
      }),
    });
    return hydrateComment(created);
  },
};

export const dashboardApi = {
  getSummary: async (): Promise<{
    pendingApprovals: number;
    upcomingUploads: number;
    totalClients: number;
    uploadedThisMonth: number;
  }> => {
    return fetchJsonDeduped('/api/dashboard/summary');
  },
};

// Notifications API (mocked until notifications schema is implemented)
export const notificationsApi = {
  getAll: async (userId?: string): Promise<Notification[]> => {
    if (userId) {
      return mockNotifications.filter((n) => n.userId === userId);
    }
    return mockNotifications;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const notification = mockNotifications.find((n) => n.id === id);
    if (!notification) throw new Error('Notification not found');
    return { ...notification, read: true };
  },

  markAllAsRead: async (): Promise<void> => {
    return;
  },

  delete: async (id: string): Promise<void> => {
    const notification = mockNotifications.find((n) => n.id === id);
    if (!notification) throw new Error('Notification not found');
  },
};

// Upload Queue API (mocked until upload queue schema is implemented)
export const queueApi = {
  getAll: async (): Promise<UploadQueue[]> => {
    return mockUploadQueue;
  },

  getById: async (id: string): Promise<UploadQueue | null> => {
    return mockUploadQueue.find((q) => q.id === id) || null;
  },

  create: async (queue: Omit<UploadQueue, 'id'>): Promise<UploadQueue> => {
    return { ...queue, id: `queue_${Date.now()}` };
  },

  update: async (id: string, updates: Partial<UploadQueue>): Promise<UploadQueue> => {
    const queue = mockUploadQueue.find((q) => q.id === id);
    if (!queue) throw new Error('Queue item not found');
    return { ...queue, ...updates };
  },

  delete: async (): Promise<void> => {
    return;
  },
};

export const workspaceApi = {
  get: async (): Promise<Workspace> => {
    return mockWorkspace;
  },

  update: async (updates: Partial<Workspace>): Promise<Workspace> => {
    return { ...mockWorkspace, ...updates };
  },
};
