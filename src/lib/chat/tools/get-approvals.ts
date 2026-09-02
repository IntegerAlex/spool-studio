import { tool, zodSchema } from "ai"
import { z } from "zod"
import { callInternalApi } from "../internal-api"
import { toAssetSummary } from "./get-assets"
import type { ToolContext } from "./context"
import type { AssetListEnvelope } from "./dto"

const REVIEW_STATUSES = ["ready_for_review", "revision_requested", "in_design", "draft"] as const
const REVIEW_STATUS_SET = new Set<string>(REVIEW_STATUSES)

export function getApprovalsTool(ctx: ToolContext) {
  return tool({
    description:
      "Find assets waiting on approval/review for a given client. Summarizes only id, title, status — not file contents.",
    inputSchema: zodSchema(
      z.object({
        clientId: z.string().uuid().optional().describe("Scope to one client"),
        includeOnly: z
          .enum(REVIEW_STATUSES)
          .optional()
          .describe("Restrict to a single review state"),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    ),
    execute: async (input) => {
      const data = await callInternalApi<AssetListEnvelope>("/api/assets", {
        cookieHeader: ctx.cookieHeader,
        query: { clientId: input.clientId, limit: input.limit },
      })
      const all = data?.data ?? []
      const pending = all.filter((a) => {
        const status = a.status ?? ""
        const inSet = REVIEW_STATUS_SET.has(status)
        return input.includeOnly ? status === input.includeOnly : inSet
      })
      return { count: pending.length, items: pending.map(toAssetSummary) }
    },
  })
}
