import { tool, zodSchema } from "ai"
import { z } from "zod"
import { callInternalApi } from "../internal-api"
import type { ToolContext } from "./context"
import type { AssetDto, AssetListEnvelope } from "./dto"

export const inputSchema = z.object({
  query: z.string().trim().max(200).optional().describe("Search by title"),
  status: z
    .enum(["draft", "in_design", "ready_for_review", "revision_requested", "approved", "published", "scheduled", "archived"])
    .optional()
    .describe("Filter by workflow status"),
  type: z.enum(["reel", "poster"]).optional().describe("Filter by asset type"),
  clientId: z.string().uuid().optional().describe("Filter by client id"),
  limit: z.number().int().min(1).max(50).default(10).describe("Max rows to return"),
})

export function toAssetSummary(a: AssetDto) {
  return {
    id: String(a.id ?? ""),
    title: a.title ?? "Untitled",
    status: a.status ?? "",
    type: a.type ?? "",
    clientId: a.clientId ?? null,
  }
}

export function getAssetsTool(ctx: ToolContext) {
  return tool({
    description:
      "List assets the user can see. Returns a compact summary (id, title, status, type, clientId) — never full blobs.",
    inputSchema: zodSchema(inputSchema),
    execute: async (input) => {
      const data = await callInternalApi<AssetListEnvelope>("/api/assets", {
        cookieHeader: ctx.cookieHeader,
        query: {
          query: input.query,
          status: input.status,
          type: input.type,
          clientId: input.clientId,
          limit: input.limit,
        },
      })
      const list = data?.data ?? []
      return { count: list.length, items: list.map(toAssetSummary) }
    },
  })
}
