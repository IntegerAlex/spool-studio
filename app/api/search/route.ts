import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { searchAssetsByTitle } from "@/repositories/assets-repository"
import { searchClients } from "@/repositories/clients-repository"

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

    const clientsRows = await searchClients(term, 5)
    const assetsRows = await searchAssetsByTitle(term, 5)

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
