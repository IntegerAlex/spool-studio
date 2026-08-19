import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/login")
  await page.fill("input#email", "admin@libreonix.com")
  await page.fill("input#password", "password123")
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL("/dashboard", { timeout: 10000 })
})

test.describe("Navigation", () => {
  test("should navigate to assets page", async ({ page }) => {
    await page.click("nav >> text=Assets")
    await expect(page).toHaveURL("/dashboard/assets")
  })

  test("should navigate to clients page", async ({ page }) => {
    await page.click("nav >> text=Clients")
    await expect(page).toHaveURL("/dashboard/clients")
  })

  test("should navigate to kanban page", async ({ page }) => {
    await page.click("nav >> text=Kanban")
    await expect(page).toHaveURL("/dashboard/kanban")
  })

  test("should navigate to approvals page", async ({ page }) => {
    await page.click("nav >> text=Approvals")
    await expect(page).toHaveURL("/dashboard/approvals")
  })

  test("should navigate to calendar page", async ({ page }) => {
    await page.click("nav >> text=Calendar")
    await expect(page).toHaveURL("/dashboard/calendar")
  })

  test("should navigate to settings page", async ({ page }) => {
    await page.click("nav >> text=Settings")
    await expect(page).toHaveURL("/dashboard/settings")
  })

  test("should navigate to upload queue page", async ({ page }) => {
    await page.click("nav >> text=Upload Queue")
    await expect(page).toHaveURL("/dashboard/queue")
  })

  test("should navigate to logs page", async ({ page }) => {
    await page.click("nav >> text=Logs")
    await expect(page).toHaveURL("/dashboard/logs")
  })
})
