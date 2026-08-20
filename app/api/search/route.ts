import { ilike, or } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { clients, contentAssets } from "@/db/schema"
import { requireUser } from "@/lib/auth"
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

    const term = `%${q.toLowerCase()}%`

    const clientsRows = await db
      .select({
        id: clients.id,
        name: clients.name,
        slug: clients.slug,
        instagram_handle: clients.instagram_handle,
      })
      .from(clients)
      .where(
        or(
          ilike(clients.name, term),
          ilike(clients.slug, term),
          ilike(clients.instagram_handle, term),
        ),
      )
      .orderBy(clients.name)
      .limit(5)

    const assetsRows = await db
      .select({
        id: contentAssets.id,
        title: contentAssets.title,
        type: contentAssets.type,
      })
      .from(contentAssets)
      .where(ilike(contentAssets.title, term))
      .orderBy(contentAssets.title)
      .limit(5)

    return NextResponse.json({
      data: {
        clients: clientsRows.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          instagramHandle: c.instagram_handle,
        })),
        assets: assetsRows.map((a) => ({
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
