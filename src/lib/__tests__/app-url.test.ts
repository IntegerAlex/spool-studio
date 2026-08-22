import { afterEach, beforeEach, describe, expect, it } from "vitest"

const ENV_KEYS = [
  "NODE_ENV",
  "NEXT_PUBLIC_APP_URL",
  "APP_URL",
  "SITE_URL",
  "VERCEL_URL",
]

// Vitest's env types mark NODE_ENV read-only; these tests must flip it,
// so go through a mutable view of process.env.
const env = process.env as Record<string, string | undefined>
const saved = new Map<string, string | undefined>()

describe("getAppUrl", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved.set(key, env[key])
      delete env[key]
    }
  })

  afterEach(() => {
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete env[key]
      } else {
        env[key] = value
      }
    }
    saved.clear()
  })

  async function load() {
    const mod = await import("@/lib/app-url")
    return mod.getAppUrl
  }

  it("prefers NEXT_PUBLIC_APP_URL, then APP_URL, then SITE_URL", async () => {
    const getAppUrl = await load()

    env.NODE_ENV = "test"
    expect(getAppUrl()).toBe("http://localhost:3000")

    env.SITE_URL = "https://site.example.com"
    expect(getAppUrl()).toBe("https://site.example.com")

    env.APP_URL = "https://app.example.com"
    expect(getAppUrl()).toBe("https://app.example.com")

    env.NEXT_PUBLIC_APP_URL = "https://next.example.com"
    expect(getAppUrl()).toBe("https://next.example.com")
  })

  it("derives https://$VERCEL_URL when no explicit URL is set", async () => {
    const getAppUrl = await load()

    env.NODE_ENV = "test"
    env.VERCEL_URL = "my-app.vercel.app"
    expect(getAppUrl()).toBe("https://my-app.vercel.app")
  })

  it("throws in production instead of falling back to localhost", async () => {
    const getAppUrl = await load()

    env.NODE_ENV = "production"
    expect(() => getAppUrl()).toThrow(/NEXT_PUBLIC_APP_URL must be set/)
  })
})
