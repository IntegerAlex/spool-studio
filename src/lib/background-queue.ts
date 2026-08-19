type JobFn = () => Promise<void>

const RECENT_KEY_TTL_MS = 2 * 60 * 1000 // 2 minutes
const PERSIST_PATH = "./.queue_recent.json"

import fs from "node:fs"

function loadRecentFromDisk(): Map<string, number> {
  try {
    if (!fs.existsSync(PERSIST_PATH)) return new Map()
    const raw = fs.readFileSync(PERSIST_PATH, "utf-8")
    const obj = JSON.parse(raw || "{}") as Record<string, number>
    return new Map(Object.entries(obj))
  } catch (_e) {
    return new Map()
  }
}

function persistRecentToDisk(m: Map<string, number>) {
  try {
    const obj: Record<string, number> = {}
    for (const [k, v] of m.entries()) obj[k] = v
    fs.writeFileSync(PERSIST_PATH, JSON.stringify(obj), { encoding: "utf-8" })
  } catch (_e) {
    // ignore disk errors
  }
}

class BackgroundQueue {
  private concurrency = 2
  private running = 0
  private queue: Array<{ fn: JobFn; key?: string; retriesLeft: number }> = []
  private recent = new Map<string, number>()
  private persistTimer: ReturnType<typeof setTimeout> | null = null

  enqueue(fn: JobFn, key?: string, retries = 2) {
    // dedupe recent keys
    if (key) {
      // load recent map lazily from disk
      if (this.recent.size === 0) {
        this.recent = loadRecentFromDisk()
      }
      const seenTs = this.recent.get(key)
      if (seenTs && Date.now() - seenTs < RECENT_KEY_TTL_MS) {
        // skip duplicate
        console.info("[notification][queue] duplicate-skip", { key })
        return
      }
      this.recent.set(key, Date.now())
      // schedule persistence
      if (this.persistTimer) clearTimeout(this.persistTimer)
      this.persistTimer = setTimeout(() => {
        persistRecentToDisk(this.recent)
      }, 5000)
    }

    this.queue.push({ fn, key, retriesLeft: retries })
    this.schedule()
  }

  private schedule() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift()!
      this.running++
      job
        .fn()
        .then(() => {
          this.running--
          this.schedule()
        })
        .catch((err) => {
          this.running--
          if (job.retriesLeft > 0) {
            job.retriesLeft--
            const attempt = 2 - job.retriesLeft
            const base = 1000
            const backoff = Math.min(30000, base * 2 ** attempt)
            const jitter = 0.5 + Math.random()
            const delay = Math.round(backoff * jitter)
            console.warn("[notification][queue] job-failed; retrying", {
              key: job.key,
              delay,
              err: err instanceof Error ? err.message : String(err),
            })
            setTimeout(() => {
              this.queue.push(job)
              this.schedule()
            }, delay)
          } else {
            console.error("[notification][queue] job-permanent-failure", {
              key: job.key,
              error: err instanceof Error ? err.message : String(err),
            })
          }
          this.schedule()
        })
    }
    // cleanup old recent entries
    const now = Date.now()
    for (const [k, ts] of Array.from(this.recent.entries())) {
      if (now - ts > RECENT_KEY_TTL_MS) this.recent.delete(k)
    }
  }
}

const globalQueue = new BackgroundQueue()

export function enqueueBackgroundJob(fn: JobFn, key?: string, retries = 2) {
  globalQueue.enqueue(fn, key, retries)
}
