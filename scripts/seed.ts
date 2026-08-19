import { randomUUID } from "node:crypto"
import bcrypt from "bcryptjs"
import { getPool, query } from "../src/lib/db"

async function seed() {
  console.log("Seeding database...\n")

  // Users
  const passwordHash = await bcrypt.hash("password123", 10)

  const adminId = randomUUID()
  const designerId = randomUUID()
  const approverId = randomUUID()

  await query(
    `INSERT INTO users (id, email, full_name, role, password_hash) VALUES ($1, $2, $3, $4, $5)`,
    [adminId, "admin@libreonix.com", "Admin User", "admin", passwordHash],
  )
  console.log("  admin@libreonix.com / password123 (admin)")

  await query(
    `INSERT INTO users (id, email, full_name, role, password_hash) VALUES ($1, $2, $3, $4, $5)`,
    [
      designerId,
      "designer@libreonix.com",
      "Designer User",
      "designer",
      passwordHash,
    ],
  )
  console.log("  designer@libreonix.com / password123 (designer)")

  await query(
    `INSERT INTO users (id, email, full_name, role, password_hash) VALUES ($1, $2, $3, $4, $5)`,
    [
      approverId,
      "approver@libreonix.com",
      "Approver User",
      "approver",
      passwordHash,
    ],
  )
  console.log("  approver@libreonix.com / password123 (approver)")

  // Clients
  const client1Id = randomUUID()
  const client2Id = randomUUID()

  await query(
    `INSERT INTO clients (id, name, slug, instagram_handle, brand_color, monthly_reels_target, monthly_posts_target, monthly_goal, weekly_goal, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      client1Id,
      "Bloom Studio",
      "bloom-studio",
      "@bloomstudio",
      "#E91E63",
      8,
      12,
      20,
      5,
      adminId,
    ],
  )
  console.log("  Client: Bloom Studio")

  await query(
    `INSERT INTO clients (id, name, slug, instagram_handle, brand_color, monthly_reels_target, monthly_posts_target, monthly_goal, weekly_goal, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      client2Id,
      "Nexus Digital",
      "nexus-digital",
      "@nexusdigital",
      "#2196F3",
      6,
      10,
      16,
      4,
      adminId,
    ],
  )
  console.log("  Client: Nexus Digital")

  // Assets
  const statuses = [
    "draft",
    "uploading",
    "uploaded",
    "ready_for_review",
    "approved",
    "published",
    "scheduled",
  ]
  for (let i = 0; i < 14; i++) {
    const clientId = i % 2 === 0 ? client1Id : client2Id
    const status = statuses[i % statuses.length]
    const type = i % 3 === 0 ? "poster" : "reel"
    await query(
      `INSERT INTO content_assets (client_id, title, type, status, created_by, assigned_to) VALUES ($1,$2,$3,$4,$5,$6)`,
      [clientId, `Asset ${i + 1} - ${type}`, type, status, adminId, designerId],
    )
  }
  console.log("  14 test assets created")

  console.log("\nSeed complete.")
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err.message)
    process.exit(1)
  })
  .finally(async () => {
    await getPool().end()
  })
