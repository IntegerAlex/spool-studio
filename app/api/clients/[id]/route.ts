import { NextResponse } from "next/server"
import { z } from "zod"
import { parseBody } from "@/lib/api-validation"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import {
  getClientDetail,
  removeClient,
  updateClient,
} from "@/services/clients-service"
import { getOrCreateCurrentUserProfile } from "@/services/users-service"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params
    console.info("[api/clients/[id]] params", params)
    const clientId = params?.id
    if (!clientId) {
      return NextResponse.json(
        { error: "Client id is required" },
        { status: 400 },
      )
    }
    const client = await getClientDetail(clientId)
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }
    return NextResponse.json({ data: client })
  } catch (error) {
    logProductionRuntimeError("api-clients-id-get", error)
    return NextResponse.json({ data: null })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    console.info("[api/clients/[id]] params", params)
    const clientId = params?.id
    if (!clientId) {
      return NextResponse.json(
        { error: "Client id is required" },
        { status: 400 },
      )
    }
    const body = await request.json()
    const clientUpdateSchema = z.object({
      name: z.string().min(1).optional(),
      slug: z.string().min(1).optional(),
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
    const parsed = parseBody(clientUpdateSchema, body)
    if (!parsed.ok) {
      return parsed.response
    }
    const input = parsed.data

    const client = await updateClient(clientId, {
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
    return NextResponse.json({ data: client })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update client"
    logProductionRuntimeError("api-clients-id-patch", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await getOrCreateCurrentUserProfile()
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const params = await context.params
    console.info("[api/clients/[id]] params", params)
    const clientId = params?.id
    if (!clientId) {
      return NextResponse.json(
        { error: "Client id is required" },
        { status: 400 },
      )
    }
    await removeClient(clientId)
    return NextResponse.json({ data: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete client"
    logProductionRuntimeError("api-clients-id-delete", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
