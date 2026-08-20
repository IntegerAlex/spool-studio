import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth/get-user"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"

export async function GET() {
  try {
    const authUser = await getCurrentUser()
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1)
    const user = rows[0]

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
      },
    })
  } catch (error) {
    logProductionRuntimeError("api-auth-me", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
