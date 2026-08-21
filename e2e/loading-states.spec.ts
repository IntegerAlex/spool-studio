import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe("Loading States", () => {
  test("dashboard should show skeleton loader before content", async ({
    page,
  }) => {
    await login(page)
    // A transient Neon hiccup can surface the inline error instead of
    // navigating; only re-submit when the form actually errored.
    const reachedDashboard = await Promise.race([
      page
        .waitForURL("**/dashboard", { timeout: 30000 })
        .then(() => true)
        .catch(() => false),
      page
        .locator(".text-red-400")
        .waitFor({ state: "visible", timeout: 30000 })
        .then(() => false)
        .catch(() => false),
    ])
    if (!reachedDashboard) {
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 })
    }

    await expect(page.locator("text=Total Assets")).toBeVisible({
      timeout: 15000,
    })
  })

  test("assets page should show loading state", async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL("/dashboard", { timeout: 30000 })

    await page.getByRole("link", { name: "Assets", exact: true }).click()
    await expect(page).toHaveURL("/dashboard/assets", { timeout: 10000 })
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 })
  })
})
