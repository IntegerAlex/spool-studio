import { eventStartString, formatDateKey } from "@/lib/calendar-utils"
import type {
  Asset,
  AssetActivityLog,
  AssetComment,
  CalendarEvent,
  CalendarRange,
  Client,
  ClientReference,
  Json,
  Notification,
  RecurrenceRule,
  UploadQueue,
  User,
  Workspace,
} from "@/types/index"

interface ApiEnvelope<T> {
  data?: T
  error?: string
}

type UploadPhase = "requesting-session" | "uploading" | "finalizing"

export interface UploadProgressUpdate {
  phase: UploadPhase
  percentage: number
}

export interface UploadFileOptions {
  onProgress?: (update: UploadProgressUpdate) => void
}

const pendingRequests = new Map<string, Promise<unknown>>()

export interface DashboardActivityItem {
  id: string
  kind: "asset" | "client"
  href: string
  title: string
  detail: string
  timestamp: Date
  iconKind: "upload" | "revision" | "approval" | "status" | "client" | "publish"
}

export interface ClientPerformanceItem {
  id: string
  name: string
  plannedDeliverables: number
  completedDeliverables: number
  completionRate: number
  nextPublishDate: string | null
}

export interface DashboardSummaryData {
  totalAssets: number
  pendingApprovals: number
  approvedAssets: number
  upcomingUploads: number
  totalClients: number
  uploadedThisMonth: number
  assetStatusBreakdown: Array<{
    label: "Draft" | "Revision" | "Approved" | "Published"
    count: number
  }>
  recentActivity: DashboardActivityItem[]
  totalDeliverables: number
  totalReelsPlanned: number
  totalReelsPublished: number
  totalPostersPlanned: number
  totalPostersPublished: number
  publishedContentCount: number
  completionPercentage: number
  clientPerformance: ClientPerformanceItem[]
  clients?: Client[]
}

export function clearApiClientCache() {
  pendingRequests.clear()
}

function buildRequestKey(input: RequestInfo, init?: RequestInit): string {
  const requestUrl = typeof input === "string" ? input : String(input)
  const method = init?.method ?? "GET"
  const body = typeof init?.body === "string" ? init.body : ""

  return `${method}:${requestUrl}:${body}`
}

async function dedupeRequest<T>(
  key: string,
  loader: () => Promise<T>,
): Promise<T> {
  const pending = pendingRequests.get(key) as Promise<T> | undefined
  if (pending) {
    return pending
  }

  const request = loader().finally(() => {
    pendingRequests.delete(key)
  })

  pendingRequests.set(key, request as Promise<unknown>)
  return request
}

async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const start = Date.now()
  const requestUrl = typeof input === "string" ? input : String(input)
  const method = init?.method ?? "GET"

  const timeoutMs = 15000
  const maxRetries = method === "GET" ? 2 : 0

  async function fetchWithRetry(attempt: number): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
      })
      clearTimeout(timer)
      // retry on transient server errors / rate limits
      if (
        (response.status === 429 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504) &&
        attempt < maxRetries
      ) {
        const backoff = Math.min(30000, 200 * 2 ** attempt)
        console.warn("[api][retry]", {
          url: requestUrl,
          method,
          status: response.status,
          attempt,
          backoff,
        })
        await new Promise((r) => setTimeout(r, backoff))
        return fetchWithRetry(attempt + 1)
      }
      return response
    } catch (err) {
      clearTimeout(timer)
      const isAbort = err instanceof Error && err.name === "AbortError"
      if ((isAbort || err instanceof TypeError) && attempt < maxRetries) {
        const backoff = Math.min(30000, 200 * 2 ** attempt)
        console.warn("[api][retry]", {
          url: requestUrl,
          method,
          attempt,
          backoff,
          reason: isAbort ? "timeout" : "network",
        })
        await new Promise((r) => setTimeout(r, backoff))
        return fetchWithRetry(attempt + 1)
      }
      throw err
    }
  }

  const response = await fetchWithRetry(0)

  const duration = Date.now() - start
  try {
    console.info("[api][perf]", {
      url: requestUrl,
      method,
      status: response.status,
      duration,
    })
  } catch (_e) {
    // ignore logging errors
  }

  if (!response.ok) {
    const payload = (await response.json()) as ApiEnvelope<T>
    throw new Error(payload.error ?? "Request failed")
  }

  const payload = (await response.json()) as ApiEnvelope<T>
  if (payload.error) {
    throw new Error(payload.error)
  }
  return payload.data as T
}

async function fetchJsonDeduped<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  return dedupeRequest(buildRequestKey(input, init), () =>
    fetchJson<T>(input, init),
  )
}

async function fetchJsonNullable<T>(input: RequestInfo): Promise<T | null> {
  const start = Date.now()
  const requestUrl = typeof input === "string" ? input : String(input)

  const timeoutMs = 15000

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response: Response
  try {
    response = await fetch(input, {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    console.warn("[api][perf][nullable][error]", {
      url: requestUrl,
      method: "GET",
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
  clearTimeout(timer)

  const duration = Date.now() - start
  try {
    console.info("[api][perf]", {
      url: requestUrl,
      method: "GET",
      status: response.status,
      duration,
    })
  } catch (_e) {
    // ignore
  }

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const payload = (await response.json()) as ApiEnvelope<T>
    throw new Error(payload.error ?? "Request failed")
  }

  const payload = (await response.json()) as ApiEnvelope<T>
  if (payload.error) {
    throw new Error(payload.error)
  }
  return payload.data as T
}

async function fetchJsonNullableDeduped<T>(
  input: RequestInfo,
): Promise<T | null> {
  return dedupeRequest(buildRequestKey(input), () =>
    fetchJsonNullable<T>(input),
  )
}

function emitUploadProgress(
  onProgress: ((update: UploadProgressUpdate) => void) | undefined,
  phase: UploadPhase,
  percentage: number,
) {
  onProgress?.({
    phase,
    percentage: Math.max(0, Math.min(100, Math.round(percentage))),
  })
}

async function uploadFileToR2Session(
  uploadUrl: string,
  file: File,
  _assetId: string,
  onProgress?: (update: UploadProgressUpdate) => void,
): Promise<void> {
  const _timer: ReturnType<typeof globalThis.setInterval> | null = null

  if (onProgress) {
    emitUploadProgress(onProgress, "uploading", 0)
  }

  try {
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest()

      xhr.open("PUT", uploadUrl, true)
      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream",
      )

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100)
          onProgress({ phase: "uploading", percentage: percent })
        }
      }

      xhr.onload = () => {
        console.info("[r2-upload][transport-complete]", {
          status: xhr.status,
        })

        resolve()
      }

      xhr.onerror = () => {
        console.warn("[r2-upload][opaque-transport]", {
          note: "Browser blocked response visibility but upload may still have succeeded.",
        })

        resolve()
      }

      xhr.send(file)
    })
  } finally {
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
  }
}

function hydrateUser(user: User): User {
  return {
    ...user,
    createdAt: new Date(user.createdAt),
  }
}

function hydrateComment(comment: AssetComment): AssetComment {
  return {
    ...comment,
    createdAt: new Date(comment.createdAt),
    updatedAt: new Date(comment.updatedAt),
  }
}

function hydrateClientReference(reference: ClientReference): ClientReference {
  return {
    ...reference,
    createdAt: new Date(reference.createdAt),
    updatedAt: new Date(reference.updatedAt),
  }
}

function hydrateClient(client: Client): Client {
  return {
    ...client,
    createdAt: client.createdAt
      ? new Date(client.createdAt as unknown as string)
      : client.createdAt,
    updatedAt: client.updatedAt
      ? new Date(client.updatedAt as unknown as string)
      : client.updatedAt,
  }
}

export const authApi = {
  login: async (
    email: string,
    password: string,
  ): Promise<{ user: User; token: string }> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return { user: data.user, token: "cookie-based" }
  },

  logout: async (): Promise<void> => {
    await fetch("/api/auth/logout", { method: "POST" })
  },

  getCurrentUser: async (): Promise<User | null> => {
    const user = await fetchJsonNullableDeduped<User>("/api/users/me")
    return user ? hydrateUser(user) : null
  },

  forgotPassword: async (email: string): Promise<void> => {
    await fetchJson("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await fetchJson("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password: newPassword }),
    })
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string,
  ): Promise<void> => {
    await fetchJson("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },

  deleteAccount: async (password: string): Promise<void> => {
    await fetchJson("/api/auth/delete-account", {
      method: "POST",
      body: JSON.stringify({ password }),
    })
  },
}

export const clientsApi = {
  getAll: async (): Promise<Client[]> => {
    const clients = await fetchJsonDeduped<Client[]>("/api/clients")
    return clients.map(hydrateClient)
  },

  getById: async (id: string): Promise<Client | null> => {
    const client = await fetchJsonNullableDeduped<Client>(`/api/clients/${id}`)
    return client ? hydrateClient(client) : null
  },

  create: async (client: {
    name: string
    slug: string
    instagramHandle?: string
    brandColor?: string
    monthlyReelsTarget?: number
    monthlyPostsTarget?: number
    monthlyGoal?: number
    weeklyGoal?: number
    weeklyPosterGoal?: number
    weeklyReelGoal?: number
    contractStartDate?: string
    contractEndDate?: string
  }): Promise<Client> => {
    const created = await fetchJson<Client>("/api/clients", {
      method: "POST",
      body: JSON.stringify(client),
    })
    return hydrateClient(created)
  },

  update: async (
    id: string,
    updates: Partial<{
      name: string
      slug: string
      instagramHandle?: string
      brandColor?: string
      monthlyReelsTarget?: number
      monthlyPostsTarget?: number
      monthlyGoal?: number
      weeklyGoal?: number
      weeklyPosterGoal?: number
      weeklyReelGoal?: number
      contractStartDate?: string
      contractEndDate?: string
    }>,
  ): Promise<Client> => {
    const updated = await fetchJson<Client>(`/api/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    })
    return hydrateClient(updated)
  },

  delete: async (id: string): Promise<void> => {
    await fetchJson(`/api/clients/${id}`, { method: "DELETE" })
  },
}

export const clientReferencesApi = {
  getByClientId: async (clientId: string): Promise<ClientReference[]> => {
    const references = await fetchJsonDeduped<ClientReference[]>(
      `/api/clients/${clientId}/references`,
    )
    return references.map(hydrateClientReference)
  },

  create: async (
    clientId: string,
    reference: {
      title: string
      url: string
      description?: string | null
      type?: ClientReference["type"]
    },
  ): Promise<ClientReference> => {
    const created = await fetchJson<ClientReference>(
      `/api/clients/${clientId}/references`,
      {
        method: "POST",
        body: JSON.stringify(reference),
      },
    )
    return hydrateClientReference(created)
  },

  update: async (
    clientId: string,
    referenceId: string,
    updates: Partial<{
      title: string
      url: string
      description?: string | null
      type: ClientReference["type"]
    }>,
  ): Promise<ClientReference> => {
    const updated = await fetchJson<ClientReference>(
      `/api/clients/${clientId}/references/${referenceId}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      },
    )
    return hydrateClientReference(updated)
  },

  delete: async (clientId: string, referenceId: string): Promise<void> => {
    await fetchJson(`/api/clients/${clientId}/references/${referenceId}`, {
      method: "DELETE",
    })
  },
}

export const assetsApi = {
  getAll: async (): Promise<Asset[]> => {
    const assets = await fetchJsonDeduped<Asset[]>("/api/assets")
    return assets.map(hydrateAsset)
  },

  getByClientId: async (clientId: string): Promise<Asset[]> => {
    const assets = await fetchJsonDeduped<Asset[]>(
      `/api/assets?clientId=${encodeURIComponent(clientId)}`,
    )
    return assets.map(hydrateAsset)
  },

  getByStatuses: async (statuses: string[]): Promise<Asset[]> => {
    const assets = await fetchJsonDeduped<Asset[]>(
      `/api/assets?statuses=${encodeURIComponent(statuses.join(","))}`,
    )
    return assets.map(hydrateAsset)
  },

  getById: async (id: string): Promise<Asset | null> => {
    const asset = await fetchJsonNullableDeduped<Asset>(`/api/assets/${id}`)
    return asset ? hydrateAsset(asset) : null
  },

  getSummaryById: async (id: string): Promise<Asset | null> => {
    const asset = await fetchJsonNullableDeduped<Asset>(
      `/api/assets/${id}/summary`,
    )
    return asset ? hydrateAsset(asset) : null
  },

  create: async (asset: {
    clientId: string
    title: string
    type: Asset["type"]
    status?: Asset["status"]
    driveFileUrl?: string
    thumbnailUrl?: string
    assignedTo?: string | null
    scheduledAt?: string | null
    publishDate?: string | null
    publishTime?: string | null
    scheduledBy?: string | null
    publishedAt?: string | null
    approvedAt?: string | null
    approvedBy?: string | null
  }): Promise<Asset> => {
    const created = await fetchJson<Asset>("/api/assets", {
      method: "POST",
      body: JSON.stringify(asset),
    })
    return hydrateAsset(created)
  },

  uploadFile: async (
    assetId: string,
    file: File,
    options?: UploadFileOptions,
  ): Promise<Asset> => {
    emitUploadProgress(options?.onProgress, "requesting-session", 0)

    const { uploadUrl, key: r2Key } = await fetchJson<{
      uploadUrl: string
      key: string
    }>(`/api/uploads/r2-session`, {
      method: "POST",
      body: JSON.stringify({
        assetId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
      }),
    })

    emitUploadProgress(options?.onProgress, "uploading", 15)
    await uploadFileToR2Session(uploadUrl, file, assetId, options?.onProgress)

    emitUploadProgress(options?.onProgress, "finalizing", 96)

    const payload = await fetchJson<{ asset: Asset; upload: unknown }>(
      `/api/assets/${assetId}/upload`,
      {
        method: "POST",
        body: JSON.stringify({
          r2Key,
          fileName: file.name,
        }),
      },
    )

    emitUploadProgress(options?.onProgress, "finalizing", 100)
    return hydrateAsset(payload.asset)
  },

  update: async (
    id: string,
    updates: Partial<{
      clientId: string
      title: string
      type: Asset["type"]
      status: Asset["status"]
      driveFileUrl?: string
      thumbnailUrl?: string
      assignedTo?: string | null
      scheduledAt?: string | null
      publishDate?: string | null
      publishTime?: string | null
      scheduledBy?: string | null
      publishedAt?: string | null
      approvedAt?: string | null
      approvedBy?: string | null
      recurrence?: Json | null
    }>,
  ): Promise<Asset> => {
    const updated = await fetchJson<Asset>(`/api/assets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    })
    return hydrateAsset(updated)
  },

  delete: async (id: string): Promise<void> => {
    await fetchJson(`/api/assets/${id}`, { method: "DELETE" })
  },
}

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const users = await fetchJsonDeduped<User[]>("/api/users")
    return users.map(hydrateUser)
  },

  getById: async (id: string): Promise<User | null> => {
    const user = await fetchJsonNullableDeduped<User>(`/api/users/${id}`)
    return user ? hydrateUser(user) : null
  },
}

export const commentsApi = {
  getByAssetId: async (assetId: string): Promise<AssetComment[]> => {
    const comments = await fetchJson<AssetComment[]>(
      `/api/assets/${assetId}/comments`,
    )
    return comments.map(hydrateComment)
  },

  getThread: async (
    assetId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ comments: AssetComment[]; users: User[] }> => {
    const params = new URLSearchParams({ includeUsers: "1" })
    if (options?.limit !== undefined) {
      params.set("limit", options.limit.toString())
    }
    if (options?.offset !== undefined) {
      params.set("offset", options.offset.toString())
    }

    const payload = await fetchJson<{
      comments: AssetComment[]
      users: User[]
    }>(`/api/assets/${assetId}/comments?${params.toString()}`)

    return {
      comments: payload.comments.map(hydrateComment),
      users: payload.users.map(hydrateUser),
    }
  },

  create: async (
    assetId: string,
    input: {
      message: string
      isInternal?: boolean
    },
  ): Promise<AssetComment> => {
    const created = await fetchJson<AssetComment>(
      `/api/assets/${assetId}/comments`,
      {
        method: "POST",
        body: JSON.stringify({
          message: input.message,
          type: input.isInternal ? "internal_note" : "comment",
        }),
      },
    )
    return hydrateComment(created)
  },
}

export const revisionsApi = {
  getByAssetId: async (
    assetId: string,
  ): Promise<{ revisions: Asset["revisions"]; users: User[] }> => {
    const payload = await fetchJson<{
      revisions: Asset["revisions"]
      users: User[]
    }>(`/api/assets/${assetId}/revisions?includeUsers=1`)
    return {
      revisions: payload.revisions.map((rev) => ({
        ...rev,
        uploadedAt: new Date(rev.uploadedAt),
        createdAt: new Date(rev.createdAt),
      })),
      users: payload.users.map(hydrateUser),
    }
  },
}

export const activityApi = {
  getByAssetId: async (
    assetId: string,
    options?: { limit?: number },
  ): Promise<{ activity: AssetActivityLog[]; users: User[] }> => {
    const params = new URLSearchParams({ includeUsers: "1" })
    if (options?.limit !== undefined) {
      params.set("limit", options.limit.toString())
    }

    const payload = await fetchJson<{
      activity: AssetActivityLog[]
      users: User[]
    }>(`/api/assets/${assetId}/activity?${params.toString()}`)

    return {
      activity: payload.activity.map((entry) => ({
        ...entry,
        createdAt: new Date(entry.createdAt),
      })),
      users: payload.users.map(hydrateUser),
    }
  },
}

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummaryData> => {
    const summary = await fetchJsonDeduped<DashboardSummaryData>(
      "/api/dashboard/summary",
    )
    return {
      ...summary,
      recentActivity: summary.recentActivity.map((entry) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      })),
    }
  },
}

export const kanbanApi = {
  getBoard: async (): Promise<{
    assets: Asset[]
    clients: { id: string; name: string }[]
  }> => {
    const payload = await fetchJsonDeduped<{
      assets: Asset[]
      clients: { id: string; name: string }[]
    }>("/api/kanban/board")
    return {
      assets: payload.assets.map(hydrateAsset),
      clients: payload.clients,
    }
  },
}

// Notifications API
export const notificationsApi = {
  getAll: async (userId?: string): Promise<Notification[]> => {
    const data = await fetchJson<Notification[]>("/api/notifications")
    if (userId) return data.filter((n) => n.userId === userId)
    return data
  },

  markAsRead: async (id: string): Promise<Notification> => {
    return fetchJson<Notification>(`/api/notifications/${id}`, {
      method: "PATCH",
    })
  },

  markAllAsRead: async (): Promise<void> => {
    await fetchJson("/api/notifications/mark-all-read", { method: "POST" })
  },

  delete: async (id: string): Promise<void> => {
    await fetchJson(`/api/notifications/${id}`, { method: "DELETE" })
  },
}

// Upload Queue API
export const queueApi = {
  getAll: async (): Promise<UploadQueue[]> => {
    return fetchJson<UploadQueue[]>("/api/queue")
  },

  getById: async (id: string): Promise<UploadQueue | null> => {
    return fetchJsonNullable<UploadQueue>(`/api/queue/${id}`)
  },

  create: async (queue: Omit<UploadQueue, "id">): Promise<UploadQueue> => {
    return fetchJson<UploadQueue>("/api/queue", {
      method: "POST",
      body: JSON.stringify(queue),
    })
  },

  update: async (
    id: string,
    updates: Partial<UploadQueue>,
  ): Promise<UploadQueue> => {
    return fetchJson<UploadQueue>(`/api/queue/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    })
  },

  delete: async (): Promise<void> => {
    await fetchJson("/api/queue", { method: "DELETE" })
  },
}

export const workspaceApi = {
  get: async (): Promise<Workspace> => {
    return fetchJson<Workspace>("/api/workspace")
  },

  update: async (updates: Partial<Workspace>): Promise<Workspace> => {
    return fetchJson<Workspace>("/api/workspace", {
      method: "PUT",
      body: JSON.stringify(updates),
    })
  },
}

export interface AuditLogEntry {
  id: string
  userId: string | null
  userEmail: string | null
  userName: string | null
  action: string
  entityType: string
  entityId: string | null
  entityName: string | null
  metadata: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export const calendarApi = {
  getMany: async (
    range?: CalendarRange,
    opts?: { includeDrafts?: boolean },
  ): Promise<CalendarEvent[]> => {
    const params = new URLSearchParams()
    if (range?.start) params.set("start", range.start)
    if (range?.end) params.set("end", range.end)
    if (opts?.includeDrafts) params.set("includeDrafts", "1")
    const qs = params.toString()
    return fetchJsonDeduped<CalendarEvent[]>(
      `/api/calendar${qs ? `?${qs}` : ""}`,
    )
  },

  reschedule: async (
    event: CalendarEvent,
    newStart: Date,
  ): Promise<CalendarEvent> => {
    const start = eventStartString(event.kind, newStart)
    if (event.kind === "upload" && event.uploadQueueId) {
      await queueApi.update(event.uploadQueueId, {
        scheduledDate: newStart.toISOString(),
      })
    } else if (event.kind === "contract" && event.clientId) {
      await clientsApi.update(event.clientId, {
        contractStartDate: formatDateKey(newStart),
      })
    } else if (event.assetId) {
      await assetsApi.update(event.assetId, {
        publishDate: formatDateKey(newStart),
        publishTime: `${String(newStart.getHours()).padStart(2, "0")}:${String(newStart.getMinutes()).padStart(2, "0")}:00`,
      })
    } else {
      throw new Error("This event cannot be rescheduled.")
    }
    return { ...event, start }
  },

  createPublish: async (input: {
    assetId: string
    start: Date
    recurrence?: RecurrenceRule | null
  }): Promise<void> => {
    await assetsApi.update(input.assetId, {
      publishDate: formatDateKey(input.start),
      publishTime: `${String(input.start.getHours()).padStart(2, "0")}:${String(input.start.getMinutes()).padStart(2, "0")}:00`,
      status: "scheduled",
      recurrence: (input.recurrence ?? null) as Json | null,
    })
  },

  createUpload: async (input: {
    assetId: string
    platform: string
    start: Date
    recurrence?: RecurrenceRule | null
  }): Promise<void> => {
    await queueApi.create({
      assetId: input.assetId,
      platform: input.platform,
      scheduledDate: input.start.toISOString(),
      status: "scheduled",
      caption: null,
      hashtags: null,
      createdAt: new Date().toISOString(),
      recurrence: (input.recurrence ?? null) as Json | null,
    })
  },
}

export const logsApi = {
  getAll: async (params?: {
    limit?: number
    offset?: number
    action?: string
    entityType?: string
    search?: string
    startDate?: string
    endDate?: string
  }): Promise<{ entries: AuditLogEntry[]; total: number }> => {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set("limit", String(params.limit))
    if (params?.offset) searchParams.set("offset", String(params.offset))
    if (params?.action) searchParams.set("action", params.action)
    if (params?.entityType) searchParams.set("entityType", params.entityType)
    if (params?.search) searchParams.set("search", params.search)
    if (params?.startDate) searchParams.set("startDate", params.startDate)
    if (params?.endDate) searchParams.set("endDate", params.endDate)
    const qs = searchParams.toString()
    return fetchJson<{ entries: AuditLogEntry[]; total: number }>(
      `/api/logs${qs ? `?${qs}` : ""}`,
    )
  },
}
