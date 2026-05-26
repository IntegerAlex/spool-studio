import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { mockNotifications } from './mock-data/notifications';
import { mockUploadQueue } from './mock-data/upload-queue';
import { mockWorkspace } from './mock-data/workspace';
import type {
  Asset,
  AssetActivityLog,
  AssetComment,
  Client,
  ClientReference,
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
let dashboardSummaryCache: {
  value: {
    pendingApprovals: number;
    upcomingUploads: number;
    totalClients: number;
    uploadedThisMonth: number;
  } | null;
  expiresAt: number;
} = {
  value: null,
  expiresAt: 0,
};

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
  let timer: ReturnType<typeof globalThis.setInterval> | null = null;

  if (onProgress) {
    emitUploadProgress(onProgress, 'uploading', 12);
    timer = globalThis.setInterval(() => {
      emitUploadProgress(onProgress, 'uploading', 12);
    }, 300);
  }

  try {
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress({ phase: 'uploading', percentage: percent });
        }
      };

      xhr.onload = () => {
        console.info('[google-upload][transport-complete]', {
          status: xhr.status,
        });

        resolve();
      };

      xhr.onerror = () => {
        console.warn('[google-upload][opaque-transport]', {
          note: 'Browser blocked response visibility but upload may still have succeeded.',
        });

        resolve();
      };

      xhr.send(file);
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
    publishedAt: asset.publishedAt ? new Date(asset.publishedAt) : null,
    approvedAt: asset.approvedAt ? new Date(asset.approvedAt) : null,
    calendarSyncedAt: asset.calendarSyncedAt ? new Date(asset.calendarSyncedAt) : null,
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

function hydrateClientReference(reference: ClientReference): ClientReference {
  return {
    ...reference,
    createdAt: new Date(reference.createdAt),
    updatedAt: new Date(reference.updatedAt),
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

export const clientReferencesApi = {
  getByClientId: async (clientId: string): Promise<ClientReference[]> => {
    const references = await fetchJsonDeduped<ClientReference[]>(`/api/clients/${clientId}/references`);
    return references.map(hydrateClientReference);
  },

  create: async (
    clientId: string,
    reference: {
      title: string;
      url: string;
      description?: string | null;
      type?: ClientReference['type'];
    }
  ): Promise<ClientReference> => {
    const created = await fetchJson<ClientReference>(`/api/clients/${clientId}/references`, {
      method: 'POST',
      body: JSON.stringify(reference),
    });
    return hydrateClientReference(created);
  },

  update: async (
    clientId: string,
    referenceId: string,
    updates: Partial<{
      title: string;
      url: string;
      description?: string | null;
      type: ClientReference['type'];
    }>
  ): Promise<ClientReference> => {
    const updated = await fetchJson<ClientReference>(`/api/clients/${clientId}/references/${referenceId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return hydrateClientReference(updated);
  },

  delete: async (clientId: string, referenceId: string): Promise<void> => {
    await fetchJson(`/api/clients/${clientId}/references/${referenceId}`, { method: 'DELETE' });
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

  getSummaryById: async (id: string): Promise<Asset | null> => {
    const asset = await fetchJsonNullableDeduped<Asset>(`/api/assets/${id}/summary`);
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
    publishDate?: string | null;
    publishTime?: string | null;
    scheduledBy?: string | null;
    publishedAt?: string | null;
    approvedAt?: string | null;
    approvedBy?: string | null;
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
      publishDate?: string | null;
      publishTime?: string | null;
      scheduledBy?: string | null;
      publishedAt?: string | null;
      approvedAt?: string | null;
      approvedBy?: string | null;
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

  getThread: async (
    assetId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ comments: AssetComment[]; users: User[] }> => {
    const params = new URLSearchParams({ includeUsers: '1' });
    if (options?.limit !== undefined) {
      params.set('limit', options.limit.toString());
    }
    if (options?.offset !== undefined) {
      params.set('offset', options.offset.toString());
    }

    const payload = await fetchJson<{ comments: AssetComment[]; users: User[] }>(
      `/api/assets/${assetId}/comments?${params.toString()}`
    );

    return {
      comments: payload.comments.map(hydrateComment),
      users: payload.users.map(hydrateUser),
    };
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

export const revisionsApi = {
  getByAssetId: async (assetId: string): Promise<{ revisions: Asset['revisions']; users: User[] }> => {
    const payload = await fetchJson<{ revisions: Asset['revisions']; users: User[] }>(
      `/api/assets/${assetId}/revisions?includeUsers=1`
    );
    return {
      revisions: payload.revisions.map((rev) => ({
        ...rev,
        uploadedAt: new Date(rev.uploadedAt),
        createdAt: new Date(rev.createdAt),
      })),
      users: payload.users.map(hydrateUser),
    };
  },
};

export const activityApi = {
  getByAssetId: async (assetId: string, options?: { limit?: number }): Promise<{ activity: AssetActivityLog[]; users: User[] }> => {
    const params = new URLSearchParams({ includeUsers: '1' });
    if (options?.limit !== undefined) {
      params.set('limit', options.limit.toString());
    }

    const payload = await fetchJson<{ activity: AssetActivityLog[]; users: User[] }>(
      `/api/assets/${assetId}/activity?${params.toString()}`
    );

    return {
      activity: payload.activity.map((entry) => ({
        ...entry,
        createdAt: new Date(entry.createdAt),
      })),
      users: payload.users.map(hydrateUser),
    };
  },
};

export const dashboardApi = {
  getSummary: async (): Promise<{
    pendingApprovals: number;
    upcomingUploads: number;
    totalClients: number;
    uploadedThisMonth: number;
  }> => {
    const now = Date.now();
    if (dashboardSummaryCache.value && dashboardSummaryCache.expiresAt > now) {
      return dashboardSummaryCache.value;
    }

    const summary = await fetchJsonDeduped('/api/dashboard/summary');
    dashboardSummaryCache = {
      value: summary,
      expiresAt: now + 30_000,
    };
    return summary;
  },
};

export const kanbanApi = {
  getBoard: async (): Promise<{
    assets: Asset[];
    clients: { id: string; name: string }[];
  }> => {
    const payload = await fetchJsonDeduped('/api/kanban/board');
    return {
      assets: payload.assets.map(hydrateAsset),
      clients: payload.clients,
    };
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
