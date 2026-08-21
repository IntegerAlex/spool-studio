import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.beforeEach(async ({ page }) => {
  await login(page)
  // Remote Postgres latency can stall login past default timeouts.
  await expect(page).toHaveURL("/dashboard", { timeout: 30000 })
})

test.describe("Dashboard", () => {
  test("should display dashboard stats", async ({ page }) => {
    await expect(page.locator("text=Total Assets")).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator("text=Total Clients")).toBeVisible()
  })

  test("should have quick action buttons", async ({ page }) => {
    await expect(page.locator("text=New Asset").first()).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator("text=Upload Files")).toBeVisible()
    await expect(page.locator("text=Add Client")).toBeVisible()
    await expect(page.locator("text=View Kanban")).toBeVisible()
  })

  test("should have timeframe selector", async ({ page }) => {
    await expect(page.locator('button:has-text("Weekly")')).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator('button:has-text("Monthly")')).toBeVisible()
  })

  test("should switch timeframe", async ({ page }) => {
    await page.click('button:has-text("Weekly")')
    await expect(page.locator("text=Weekly Goals")).toBeVisible({
      timeout: 5000,
    })

    await page.click('button:has-text("Monthly")')
    await expect(page.locator("text=Monthly Goals")).toBeVisible({
      timeout: 5000,
    })
  })

  test("should display asset status breakdown", async ({ page }) => {
    await expect(page.locator("text=Asset Status Breakdown")).toBeVisible({
      timeout: 10000,
    })
  })

  test("should display recent activity", async ({ page }) => {
    await expect(page.locator("text=Recent Activity")).toBeVisible({
      timeout: 10000,
    })
  })

  test("should display top active clients table", async ({ page }) => {
    await expect(page.locator("text=Top Active Clients")).toBeVisible({
      timeout: 10000,
    })
  })

  test("should display reels and posters overview", async ({ page }) => {
    await expect(page.locator("text=Reels Overview")).toBeVisible({
      timeout: 10000,
    })
    await expect(page.locator("text=Posters Overview")).toBeVisible()
  })
})
