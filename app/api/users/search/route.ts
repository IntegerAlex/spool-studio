import { NextResponse } from "next/server"
import { asc, ilike, or } from "drizzle-orm"
import { requireUser } from "@/lib/auth"
import { db } from "@/db"
import { users } from "@/db/schema"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

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

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        full_name: users.full_name,
        avatar_url: users.avatar_url,
      })
      .from(users)
      .where(or(ilike(users.full_name, searchTerm), ilike(users.email, searchTerm)))
      .orderBy(asc(users.full_name))
      .limit(10)

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
