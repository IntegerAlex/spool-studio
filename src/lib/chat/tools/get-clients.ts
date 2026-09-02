import { tool, zodSchema } from "ai"
import { z } from "zod"
import { callInternalApi } from "../internal-api"
import type { ToolContext } from "./context"
import type { ClientDto, ClientListEnvelope } from "./dto"

export function toClientSummary(c: ClientDto) {
  return {
    id: String(c.id ?? ""),
    name: c.name ?? "Unnamed client",
    email: c.email ?? null,
  }
}

export function getClientsTool(ctx: ToolContext) {
  return tool({
    description:
      "List clients the user can see. Returns compact id/name/email summaries. Used to look up a client before answering about their approvals or assets.",
    inputSchema: zodSchema(
      z.object({
        query: z.string().trim().max(200).optional().describe("Search by name"),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    ),
    execute: async (input) => {
      const data = await callInternalApi<ClientListEnvelope>("/api/clients", {
        cookieHeader: ctx.cookieHeader,
        query: { query: input.query, limit: input.limit },
      })
      const list = data?.data ?? []
      return { count: list.length, items: list.map(toClientSummary) }
    },
  })
}
