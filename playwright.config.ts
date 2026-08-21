import { defineConfig } from "@playwright/test"
// @next/env is CJS; its named export is not detectable under ESM interop,
// so use the default binding. Loads DATABASE_URL etc. for db-touching specs.
import nextEnv from "@next/env"

nextEnv.loadEnvConfig(process.cwd())

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    port: 3000,
    timeout: 120000,
    reuseExistingServer: true,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
})
