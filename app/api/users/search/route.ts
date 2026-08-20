import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { searchUsers } from "@/repositories/users-repository"

export async function GET(request: Request) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")
    if (!q || q.trim().length === 0) {
      return NextResponse.json({ data: [] })
    }

    const searchTerm = `%${q.trim().toLowerCase()}%`

    const rows = await searchUsers(searchTerm, 10)

    const result = rows.map((u) => ({
      id: u.id,
      name: u.full_name ?? u.email,
      email: u.email,
      avatar: u.avatar_url ?? null,
    }))

    return NextResponse.json({ data: result })
  } catch (error) {
    logProductionRuntimeError("api-users-search-get", error)
    return NextResponse.json({ data: [] })
  }
}
