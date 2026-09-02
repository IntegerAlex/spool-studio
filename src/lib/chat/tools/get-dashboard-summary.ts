import { tool, zodSchema } from "ai"
import { z } from "zod"
import { callInternalApi } from "../internal-api"
import type { ToolContext } from "./context"
import type { DashboardSummaryDto } from "./dto"

export function getDashboardSummaryTool(ctx: ToolContext) {
  return tool({
    description:
      "Fetch the current dashboard headline numbers (total assets, clients, pending items). Compact, aggregate data only.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => {
      const data = await callInternalApi<DashboardSummaryDto>(
        "/api/dashboard/summary",
        { cookieHeader: ctx.cookieHeader },
      )
      const d = data ?? {}
      return {
        assets: d.assets ?? null,
        clients: d.clients ?? null,
        pendingApprovals: d.pendingApprovals ?? null,
      }
    },
  })
}
