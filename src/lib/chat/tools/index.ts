import type { ToolSet } from "ai"
import { allowedToolNames } from "../guardrails"
import { addCommentTool } from "./add-comment"
import type { ToolContext } from "./context"
import { getApprovalsTool } from "./get-approvals"
import { getAssetsTool } from "./get-assets"
import { getClientsTool } from "./get-clients"
import { getDashboardSummaryTool } from "./get-dashboard-summary"
import { moveAssetStatusTool } from "./move-asset-status"

/**
 * Tool registry. Builds the concrete AI-SDK ToolSet for one request, gated to
 * the tools the requesting user's role is allowed to call. The tool-name ->
 * permission mapping lives in src/lib/chat/guardrails (gateTool). Adding a new
 * tool requires:
 *   1. a factory here, and
 *   2. a row in guardrails.TOOL_PERMISSION_MAP granting it to roles.
 * See docs/CHAT_HARNESS.md.
 */
export function buildToolSet(ctx: ToolContext): ToolSet {
  const all = {
    get_dashboard_summary: getDashboardSummaryTool(ctx),
    get_assets: getAssetsTool(ctx),
    get_clients: getClientsTool(ctx),
    get_approvals: getApprovalsTool(ctx),
    move_asset_status: moveAssetStatusTool(ctx),
    add_comment: addCommentTool(ctx),
  }

  const allowed = new Set(allowedToolNames(ctx.user.role))
  // SAFETY: Object.keys of a fixed object yields exactly its own keys.
  const names = Object.keys(all) as (keyof typeof all)[]
  const entries = names
    .filter((name) => allowed.has(name))
    .map((name) => [name, all[name]] as const)
  // SAFETY: entries were filtered to role-allowed tool names; fromEntries
  // rebuilds an equivalent ToolSet from the same concrete tool objects.
  return Object.fromEntries(entries) as ToolSet
}
