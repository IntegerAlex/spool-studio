/**
 * In-memory fixed-window rate limiter.
 *
 * LIMITATIONS (accepted, documented): storage is per-instance and resets on
 * cold start. On Vercel serverless this bounds abuse per lambda instance
 * only - front the deployment with Vercel Firewall/WAF for global rate
 * enforcement. Standalone single-instance deployments get full protection.
 *
 * Keying on client-supplied headers (x-forwarded-for) means attackers can
 * rotate keys to dodge per-IP limits; per-instance storage caps the memory
 * impact of that (swept periodically).
 */

interface RateLimitOptions {
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  ok: boolean
  retryAfterSeconds: number
}

const hits = new Map<
  string,
  { count: number; windowStart: number; expiresAt: number }
>()

const SWEEP_INTERVAL_MS = 60_000
let sweeperStarted = false

function startSweeper() {
  if (sweeperStarted) return
  sweeperStarted = true
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of hits) {
      // Expire per-entry using the entry's own window length; a fixed
      // threshold would cut long windows (e.g. 1hr reset-password) short.
      if (now > entry.expiresAt) {
        hits.delete(key)
      }
    }
    // Never keep the event loop alive just for sweeping.
    if (hits.size === 0) {
      clearInterval(timer)
      sweeperStarted = false
    }
  }, SWEEP_INTERVAL_MS)
  timer.unref()
}

export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  startSweeper()

  const now = Date.now()
  const entry = hits.get(key)

  if (!entry || now - entry.windowStart >= windowMs) {
    hits.set(key, { count: 1, windowStart: now, expiresAt: now + windowMs })
    return { ok: true, retryAfterSeconds: 0 }
  }

  entry.count += 1

  if (entry.count > limit) {
    const retryAfterSeconds = Math.ceil(
      (entry.windowStart + windowMs - now) / 1000,
    )
    return { ok: false, retryAfterSeconds }
  }

  return { ok: true, retryAfterSeconds: 0 }
}

/**
 * Best-effort client IP for rate-limit keying behind Vercel: first hop of
 * x-forwarded-for, else x-real-ip, else "unknown".
 */
export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown"
  }
  return request.headers.get("x-real-ip") ?? "unknown"
}
