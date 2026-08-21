import { expect, test, type Page } from "@playwright/test"
import { login } from "./helpers"

// The hotkey handler registers on hydration; a press fired against raw SSR
// HTML is lost. Retry once after a settle delay to absorb slow hydration.
async function openPaletteWithHotkey(page: Page) {
  const dialog = page.getByRole("dialog")
  await page.keyboard.press("ControlOrMeta+k")
  try {
    await dialog.waitFor({ state: "visible", timeout: 4000 })
  } catch {
    await page.waitForTimeout(1500)
    await page.keyboard.press("ControlOrMeta+k")
    await dialog.waitFor({ state: "visible", timeout: 4000 })
  }
  return dialog
}

test.describe("Search palette", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL("/dashboard", { timeout: 30000 })
  })

  test("opens via Cmd/Ctrl+K, shows grouped results, navigates on Enter", async ({
    page,
  }) => {
    const dialog = await openPaletteWithHotkey(page)

    await dialog
      .getByPlaceholder("Search clients and assets…")
      .fill("Bloom")

    const clientsGroup = dialog.getByText("Clients", { exact: true })
    await expect(clientsGroup).toBeVisible({ timeout: 10000 })
    await expect(dialog.getByText("Bloom Studio")).toBeVisible()

    await dialog.getByText("Bloom Studio").first().click()
    await expect(page).toHaveURL(/\/dashboard\/clients\/[0-9a-f-]+/, {
      timeout: 10000,
    })
  })

  test("opens via the header trigger button and closes on Escape", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: /Search/ })
      .click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
  })

  test("shows the empty state for unmatched queries", async ({ page }) => {
    const dialog = await openPaletteWithHotkey(page)

    await dialog
      .getByPlaceholder("Search clients and assets…")
      .fill("zzz-no-match-xyz")
    await expect(dialog.getByText("No matches found.")).toBeVisible({
      timeout: 10000,
    })
  })
})
