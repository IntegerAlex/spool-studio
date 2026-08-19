import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { getPool } from "@/lib/db"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get("q") ?? "").trim()
    if (!q) {
      return NextResponse.json({ data: { clients: [], assets: [] } })
    }

    const pool = getPool()
    const term = `%${q.toLowerCase()}%`

    const { rows: clients } = await pool.query(
      `SELECT id, name, slug, instagram_handle
       FROM clients
       WHERE lower(name) LIKE $1 OR lower(slug) LIKE $1 OR lower(instagram_handle) LIKE $1
       ORDER BY name
       LIMIT 5`,
      [term],
    )

    const { rows: assets } = await pool.query(
      `SELECT id, title, type
       FROM content_assets
       WHERE lower(title) LIKE $1
       ORDER BY title
       LIMIT 5`,
      [term],
    )

    return NextResponse.json({
      data: {
        clients: clients.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          instagramHandle: c.instagram_handle,
        })),
        assets: assets.map((a) => ({
          id: a.id,
          title: a.title,
          type: a.type,
        })),
      },
    })
  } catch (error) {
    logProductionRuntimeError("api-search-get", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
