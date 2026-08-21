import { expect, test } from "@playwright/test"
import { login } from "./helpers"

test.describe("Authentication", () => {
  test("should redirect unauthenticated user to login", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login/)
  })

  test("should show login page", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test("should show error for invalid credentials", async ({ page }) => {
    await login(page, "wrong@example.com", "wrongpassword")
    await expect(page.locator(".text-red-400")).toBeVisible({
      timeout: 5000,
    })
  })

  test("should login with valid credentials and redirect to dashboard", async ({
    page,
  }) => {
    await login(page)
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 })
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  })

  test("should logout and redirect to login", async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 })

    // The sidebar footer exposes the only logout affordance.
    const signOutButton = page.getByRole("button", { name: "Sign Out" })
    await expect(signOutButton).toBeVisible()
    await signOutButton.click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
