import { expect, test } from "@playwright/test"
import { closeDb, withDb } from "./db"
import { ADMIN_EMAIL, login } from "./helpers"

const ASSET_TITLE = "E2E Portal Asset"

let clientId: string
let adminId: string
let assetId: string

test.beforeAll(async () => {
  await withDb(async (client) => {
    const clientRow = await client.query(
      "select id from clients order by created_at limit 1",
    )
    clientId = clientRow.rows[0].id

    const user = await client.query("select id from users where email = $1", [
      ADMIN_EMAIL,
    ])
    adminId = user.rows[0].id

    // Dedicated asset so the spec never depends on (or dirties) seed data.
    // 'uploaded' is portal-listed and shows the Approve button.
    const inserted = await client.query(
      `insert into content_assets (client_id, title, type, status, created_by)
       values ($1, $2, 'reel', 'uploaded', $3) returning id`,
      [clientId, ASSET_TITLE, adminId],
    )
    assetId = inserted.rows[0].id
  })
})

test.afterAll(async () => {
  await withDb(async (client) => {
    await client.query("delete from portal_tokens where client_id = $1", [
      clientId,
    ])
    await client.query("delete from content_assets where id = $1", [assetId])
  })
  await closeDb()
})

test.describe("Portal token lifecycle", () => {
  test("admin creates a token, portal approves an asset, raw token is never stored retrievably", async ({
    page,
  }) => {
    await login(page)
    await expect(page).toHaveURL("/dashboard", { timeout: 30000 })

    // 1. Create a portal token as admin; capture the one-time raw token.
    const createResponse = await page.request.post("/api/portal/token", {
      data: { clientId, expiresInDays: 30 },
    })
    expect(createResponse.status()).toBe(201)
    // SAFETY: the 201 contract of POST /api/portal/token is { data: { id, token, ... } }.
    const { data: created } = (await createResponse.json()) as {
      data: { id: string; token: string }
    }
    const rawToken = created.token

    // 2. Hash-storage sanity: the listing must not contain the raw token.
    const listResponse = await page.request.get("/api/portal/token")
    expect(listResponse.status()).toBe(200)
    const listBody = await listResponse.text()
    expect(listBody).not.toContain(rawToken)

    try {
      // 3. Portal view lists the client's assets.
      await page.goto(`/${rawToken}`)
      await expect(page.getByText(ASSET_TITLE).first()).toBeVisible({
        timeout: 15000,
      })

      // 4. Open the asset and submit an approval decision.
      await page.getByText(ASSET_TITLE).first().click()
      await expect(page).toHaveURL(
        new RegExp(`/${rawToken}/assets/${assetId}`),
      )

      const approveButton = page.getByRole("button", { name: "Approve" })
      await expect(approveButton).toBeVisible({ timeout: 15000 })
      await approveButton.click()
      // The button disappears once status is approved - unambiguous signal
      // that the decision round-tripped (unlike the static "Approved" dl
      // label, which is always present).
      await expect(approveButton).toBeHidden({ timeout: 15000 })

      // 5. The status change persisted.
      const status = await withDb(async (client) => {
        const row = await client.query(
          "select status from content_assets where id = $1",
          [assetId],
        )
        // SAFETY: pg types enum columns as string at runtime.
        return row.rows[0].status as string
      })
      expect(status).toBe("approved")
    } finally {
      await withDb(async (client) => {
        await client.query("delete from portal_tokens where id = $1", [
          created.id,
        ])
      })
    }
  })

  test("rejected payloads get structured 400s", async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL("/dashboard", { timeout: 30000 })

    const negative = await page.request.post("/api/portal/token", {
      data: { clientId, expiresInDays: -5 },
    })
    expect(negative.status()).toBe(400)

    const huge = await page.request.post("/api/portal/token", {
      data: { clientId, expiresInDays: 3650 },
    })
    expect(huge.status()).toBe(400)

    const badClient = await page.request.post("/api/portal/token", {
      data: { clientId: "not-a-uuid" },
    })
    expect(badClient.status()).toBe(400)
  })
})
