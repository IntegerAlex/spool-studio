import { NextResponse } from "next/server"
import type { ZodType } from "zod"

export function parseBody<T>(
  schema: ZodType<T>,
  // oxlint-disable-next-line anti-slop/no-unknown-parameters  // generic boundary helper: schema parses the unknown payload
  body: unknown,
): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const result = schema.safeParse(body)
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }))
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Validation failed", issues },
        { status: 400 },
      ),
    }
  }
  return { ok: true, data: result.data }
}
