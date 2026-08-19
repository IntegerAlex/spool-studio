import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { createServerSupabaseClient } from "@/lib/supabase/server"

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

    const supabase = await createServerSupabaseClient()
    const searchTerm = `%${q.trim().toLowerCase()}%`

    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url")
      .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .order("full_name", { ascending: true })
      .limit(10)

    if (error) {
      throw new Error(error.message)
    }

    const users = (data ?? []).map(
      (u: {
        id: string
        email: string
        full_name: string | null
        avatar_url: string | null
      }) => ({
        id: u.id,
        name: u.full_name ?? u.email,
        email: u.email,
        avatar: u.avatar_url ?? null,
      }),
    )

    return NextResponse.json({ data: users })
  } catch (error) {
    logProductionRuntimeError("api-users-search-get", error)
    return NextResponse.json({ data: [] })
  }
}
