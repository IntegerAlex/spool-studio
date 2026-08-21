import { NextResponse } from "next/server"
import { z } from "zod"
import { parseBody } from "@/lib/api-validation"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { createClient, getClients } from "@/services/clients-service"

export async function GET() {
  try {
    const clients = await getClients()
    const response = NextResponse.json({ data: clients })
    response.headers.set(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=60",
    )
    return response
  } catch (error) {
    logProductionRuntimeError("api-clients-get", error)
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const clientCreateSchema = z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      instagramHandle: z.string().nullish(),
      brandColor: z.string().nullish(),
      monthlyReelsTarget: z.number().int().nonnegative().nullish(),
      monthlyPostsTarget: z.number().int().nonnegative().nullish(),
      monthlyGoal: z.number().int().nonnegative().nullish(),
      weeklyGoal: z.number().int().nonnegative().nullish(),
      weeklyPosterGoal: z.number().int().nonnegative().nullish(),
      weeklyReelGoal: z.number().int().nonnegative().nullish(),
      contractStartDate: z.coerce.date().nullish(),
      contractEndDate: z.coerce.date().nullish(),
    })
    const parsed = parseBody(clientCreateSchema, body)
    if (!parsed.ok) {
      return parsed.response
    }
    const input = parsed.data

    const client = await createClient({
      name: input.name,
      slug: input.slug,
      instagramHandle: input.instagramHandle ?? undefined,
      brandColor: input.brandColor ?? undefined,
      monthlyReelsTarget: input.monthlyReelsTarget ?? undefined,
      monthlyPostsTarget: input.monthlyPostsTarget ?? undefined,
      monthlyGoal: input.monthlyGoal ?? undefined,
      weeklyGoal: input.weeklyGoal ?? undefined,
      weeklyPosterGoal: input.weeklyPosterGoal ?? undefined,
      weeklyReelGoal: input.weeklyReelGoal ?? undefined,
      contractStartDate: input.contractStartDate
        ? input.contractStartDate.toISOString().slice(0, 10)
        : undefined,
      contractEndDate: input.contractEndDate
        ? input.contractEndDate.toISOString().slice(0, 10)
        : undefined,
    })
    return NextResponse.json({ data: client }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create client"
    logProductionRuntimeError("api-clients-post", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
