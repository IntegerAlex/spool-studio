import { expect, test } from "@playwright/test"
import { closeDb, withDb } from "./db"
import { ADMIN_EMAIL, login } from "./helpers"

const NOTIFICATION_TITLE = "E2E bell smoke notification"

let adminId: string
let assetId: string

test.beforeAll(async () => {
  await withDb(async (client) => {
    const user = await client.query(
      "select id from users where email = $1",
      [ADMIN_EMAIL],
    )
    adminId = user.rows[0].id

    const asset = await client.query(
      "select id from content_assets order by created_at limit 1",
    )
    assetId = asset.rows[0].id

    await client.query(
      `insert into notifications (user_id, type, title, message, related_asset_id, read)
       values ($1, 'asset_uploaded', $2, 'Seeded by notifications-bell.spec', $3, false)`,
      [adminId, NOTIFICATION_TITLE, assetId],
    )
  })
})

test.afterAll(async () => {
  await withDb(async (client) => {
    await client.query("delete from notifications where title = $1", [
      NOTIFICATION_TITLE,
    ])
  })
  await closeDb()
})

test.describe("Notifications bell", () => {
  test("shows unread badge, opens popover, deep-links on click", async ({
    page,
  }) => {
    await login(page)
    await expect(page).toHaveURL("/dashboard", { timeout: 30000 })

    const bell = page.getByRole("button", { name: "Notifications" })
    // Badge should reflect the seeded unread notification.
    await expect(bell.getByText("1", { exact: true })).toBeVisible({
      timeout: 10000,
    })

    await bell.click()
    const popover = page.getByText(NOTIFICATION_TITLE)
    await expect(popover).toBeVisible()

    // Deep-link to the related asset; marks the item read via cache patch.
    await popover.click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/assets/${assetId}`), {
      timeout: 10000,
    })
  })

  test("View all navigates to the notifications page", async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL("/dashboard", { timeout: 30000 })

    await page.getByRole("button", { name: "Notifications" }).click()
    await page.getByRole("link", { name: "View all" }).click()
    await expect(page).toHaveURL("/dashboard/notifications", {
      timeout: 10000,
    })
    await expect(
      page.getByRole("heading", { name: NOTIFICATION_TITLE }),
    ).toBeVisible()
  })
})
