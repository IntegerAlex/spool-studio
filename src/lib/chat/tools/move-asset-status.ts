import { tool, zodSchema } from "ai"
import { z } from "zod"
import { callInternalApi } from "../internal-api"
import type { ToolContext } from "./context"

export const inputSchema = z.object({
  assetId: z.string().uuid().describe("The asset to update"),
  status: z
    .enum(["in_design", "ready_for_review", "revision_requested", "approved", "archived"])
    .describe("Target workflow status"),
  reason: z
    .string().trim().max(500).optional()
    .describe("Optional note explaining the change"),
})

interface MutationEnvelope {
  data?: { id?: string }
}

type AssetPatch = { status: string; notes?: string }

export function moveAssetStatusTool(ctx: ToolContext) {
  return tool({
    description:
      "Move an asset to a new workflow status (requires the asset:update permission). On denial the caller must surface the generic access message.",
    inputSchema: zodSchema(inputSchema),
    execute: async (input) => {
      const body: AssetPatch = { status: input.status }
      if (input.reason) body.notes = input.reason
      await callInternalApi<MutationEnvelope>(`/api/assets/${input.assetId}`, {
        cookieHeader: ctx.cookieHeader,
        method: "PATCH",
        body,
      })
      return { ok: true, assetId: input.assetId, status: input.status }
    },
  })
}
