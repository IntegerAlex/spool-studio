import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.beforeEach(async ({ page }) => {
  await login(page)
  // Remote Postgres latency can stall login past default timeouts.
  await expect(page).toHaveURL("/dashboard", { timeout: 30000 })
})

test.describe("Navigation", () => {
  const cases: Array<[name: string, path: string]> = [
    ["Assets", "/dashboard/assets"],
    ["Clients", "/dashboard/clients"],
    ["Kanban", "/dashboard/kanban"],
    ["Approvals", "/dashboard/approvals"],
    ["Calendar", "/dashboard/calendar"],
    ["Settings", "/dashboard/settings"],
    ["Upload Queue", "/dashboard/queue"],
    ["Logs", "/dashboard/logs"],
  ]

  for (const [name, path] of cases) {
    test(`should navigate to ${name.toLowerCase()} page`, async ({ page }) => {
      // Sidebar entries are links (no <nav> wrapper in the shadcn sidebar).
      await page.getByRole("link", { name, exact: true }).click()
      await expect(page).toHaveURL(path)
    })
  }
})
