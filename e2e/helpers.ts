import type { Page } from "@playwright/test"

export const ADMIN_EMAIL = "admin@libreonix.com"
export const ADMIN_PASSWORD = "password123"

export async function login(
  page: Page,
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD,
) {
  await page.goto("/login")
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
}
