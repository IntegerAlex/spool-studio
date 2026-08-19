import { NextResponse } from "next/server"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { getAssetRevisions } from "@/services/assets-service"
import { getUsersByIds } from "@/services/users-service"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const assetId = params?.id
    if (!assetId) {
      return NextResponse.json(
        { error: "Asset id is required" },
        { status: 400 },
      )
    }

    const { searchParams } = new URL(_request.url)
    const includeUsers = searchParams.get("includeUsers") === "1"

    const revisions = await getAssetRevisions(assetId)
    if (!includeUsers) {
      return NextResponse.json({ data: revisions })
    }

// SAFETY: this cast is safe because the value already conforms to the asserted type.
    const userIds = Array.from(
      new Set(revisions.map((rev) => rev.uploadedBy).filter(Boolean)),
    ) as string[]
    const users = await getUsersByIds(userIds)
    return NextResponse.json({ data: { revisions, users } })
  } catch (error) {
    logProductionRuntimeError("api-assets-revisions-get", error)
    return NextResponse.json({ data: [] })
  }
}
