import { NextResponse } from "next/server"
import { destroySession } from "@/lib/auth/session"

export async function POST() {
  const session = destroySession()
  const response = NextResponse.json({ success: true })

  response.cookies.set(
    session.name,
    session.value,
    // SAFETY: this cast is safe because the value already conforms to the asserted type.
    session.options as Parameters<typeof response.cookies.set>[2],
  )

  return response
}
