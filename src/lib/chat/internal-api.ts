import { ApiError } from "@/lib/api-error"

/**
 * Typed error signalling that the requesting user is not authorized to perform
 * the tool's underlying operation. The chat route converts this into the calm,
 * generic user-facing denial message ("You don't have access to do that").
 *
 * It is NEVER treated as a generic failure: the agent must not retry with
 * elevated scope or report success after one of these is thrown.
 */
export class AccessDeniedError extends Error {
  constructor(message = "You don't have access to do that.") {
    super(message)
    this.name = "AccessDeniedError"
  }
}

/**
 * Internal API client used exclusively by chat tools. It calls the existing
 * app/api route handlers with the requesting user's own session cookie so that
 * every existing authorization check in the API layer is reused — the chat
 * layer never touches repositories or the DB directly.
 *
 * Hardening rules:
 *  - Only paths under a fixed allow-list prefix (`/api/`) are accepted; the
 *    caller passes a path relative to the API base so no arbitrary host or URL
 *    can be constructed.
 *  - The host is derived from env (APP_URL/SITE_URL/NEXT_PUBLIC_APP_URL) or a
 *    loopback default — never from model/user input.
 */

const ALLOWED_PREFIXES = ["/api/"] as const

export interface InternalApiEnvelope<T> {
  data?: T
  error?: string
  issues?: { path: string; message: string }[]
}

export interface InternalApiOptions {
  /** Serialized request cookie (e.g. `cms_session=...`) forwarded as-is. */
  cookieHeader: string
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
}

function resolveApiBaseUrl(): string {
  const envUrl =
    process.env.APP_URL ??
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL
  if (envUrl) return envUrl.replace(/\/$/, "")
  // Development/self-hosted loopback. In production a public URL must be set.
  const port = process.env.PORT ?? "3000"
  return `http://127.0.0.1:${port}`
}

function assertSafePath(path: string): void {
  if (!path.startsWith("/")) {
    throw new Error("Internal API path must start with '/'")
  }
  // Disallow protocol-relative and full-URL smuggling.
  if (path.startsWith("//") || /^[a-z][a-z0-9+.-]*:\/\//i.test(path)) {
    throw new Error("Internal API path must be a local route")
  }
  if (!ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
    throw new Error(`Internal API path not allow-listed: ${path}`)
  }
}

/**
 * Call an existing internal route. Returns the parsed `data` payload on 2xx.
 * On HTTP 403 it throws `AccessDeniedError` so tools can distinguish a real
 * authorization failure from other errors. All other non-2xx statuses throw an
 * `ApiError` with the surfaced status.
 */
export async function callInternalApi<T>(
  path: string,
  options: InternalApiOptions,
): Promise<T> {
  assertSafePath(path)
  if (!options.cookieHeader) {
    throw ApiError.unauthorized("Missing session for internal API call")
  }

  const base = resolveApiBaseUrl()
  const url = new URL(path, base)
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }

  const headers = new Headers({
    cookie: options.cookieHeader,
    accept: "application/json",
  })
  if (options.body !== undefined) headers.set("content-type", "application/json")

  const res = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    // Never cache tool results across turns.
    cache: "no-store",
  })

  if (res.status === 403) {
    throw new AccessDeniedError()
  }

  let envelope: InternalApiEnvelope<T> | null = null
  try {
    // SAFETY: the JSON body is a parsed envelope; `as` only narrows the unknown
    // parse result to our envelope shape without asserting field contents.
    envelope = (await res.json()) as InternalApiEnvelope<T>
  } catch {
    envelope = null
  }

  if (!res.ok) {
    const message = envelope?.error ?? `Request failed with status ${res.status}`
    throw new ApiError(message, res.status, envelope?.issues)
  }

  if (envelope && "data" in envelope) {
    // SAFETY: presence of `data` is checked above; cast only strips the
    // envelope wrapper. Field validity is the caller's typed-DTO concern.
    return envelope.data as T
  }
  // Some routes return the payload at the top level; be permissive.
  // SAFETY: for routes without an envelope, the raw parsed JSON is the payload.
  return (envelope ?? undefined) as T
}
