import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.beforeEach(async ({ page }) => {
  await login(page)
  // Remote Postgres latency can stall login past default timeouts.
  await expect(page).toHaveURL("/dashboard", { timeout: 30000 })
  await page.getByRole("link", { name: "Clients", exact: true }).click()
  await expect(page).toHaveURL("/dashboard/clients", { timeout: 10000 })
})

test.describe("Clients", () => {
  test("should display client list", async ({ page }) => {
    await expect(page.locator("text=Bloom Studio")).toBeVisible({
      timeout: 10000,
    })
  })

  test("should open client detail", async ({ page }) => {
    await page.click("text=Bloom Studio")
    await expect(page.locator("text=Bloom Studio")).toBeVisible({
      timeout: 10000,
    })
  })
})
