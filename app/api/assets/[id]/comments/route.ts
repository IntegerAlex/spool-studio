import { NextResponse } from "next/server"
import { z } from "zod"
import { ApiError, jsonError } from "@/lib/api-error"
import { parseBody } from "@/lib/api-validation"
import { logProductionRuntimeError } from "@/lib/runtime-diagnostics"
import { logAssetActivity } from "@/services/activity-service"
import {
  createComment,
  getCommentsByAssetId,
  getCommentsWithUsers,
} from "@/services/comments-service"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const assetId = params?.id
    if (!assetId) {
      throw ApiError.badRequest("Asset id is required")
    }

    const { searchParams } = new URL(_request.url)
    const includeUsers = searchParams.get("includeUsers") === "1"
    const limitParam = searchParams.get("limit")
    const offsetParam = searchParams.get("offset")
    const limit = limitParam ? Number(limitParam) : undefined
    const offset = offsetParam ? Number(offsetParam) : undefined

    if (includeUsers) {
      const payload = await getCommentsWithUsers(assetId, { limit, offset })
      return NextResponse.json({ data: payload })
    }

    const comments = await getCommentsByAssetId(assetId, { limit, offset })
    return NextResponse.json({ data: comments })
  } catch (error) {
    logProductionRuntimeError("api-assets-comments-get", error)
    return jsonError(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params
    const assetId = params?.id
    if (!assetId) {
      throw ApiError.badRequest("Asset id is required")
    }

    const raw = await request.json()
    const commentCreateSchema = z.object({
      message: z.string().min(1, "Message is required"),
      type: z.enum(["comment", "revision", "approval_note", "internal_note"]).optional(),
    })
    const parsed = parseBody(commentCreateSchema, raw)
    if (!parsed.ok) {
      return parsed.response
    }
    const body = parsed.data

    const comment = await createComment({
      assetId,
      type: body.type ?? "comment",
      message: body.message,
      revisionStatus: body.type === "revision" ? "open" : null,
    })

    try {
      const action =
        comment.type === "revision"
          ? "revision_requested"
          : comment.type === "approval_note"
            ? "approval_note_added"
            : comment.type === "internal_note"
              ? "internal_note_added"
              : "comment_added"

      await logAssetActivity({
        assetId,
        action,
        metadata: {
          commentId: comment.id,
          type: comment.type,
        },
      })
    } catch {
      // Activity logging should not block comment creation.
    }

    return NextResponse.json({ data: comment }, { status: 201 })
  } catch (error) {
    logProductionRuntimeError("api-assets-comments-post", error)
    return jsonError(error)
  }
}
