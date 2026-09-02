import type { AuthUser } from "@/lib/auth/types"

/**
 * Server-side execution context injected into every chat tool. Carries the
 * requesting user's session so each tool calls the internal API with the
 * user's own cookie — never a service credential. Also carries the role for
 * tool gating.
 */
export interface ToolContext {
  user: Pick<AuthUser, "id" | "email" | "role">
  /** Raw `Cookie` header value (e.g. `cms_session=...`) to forward. */
  cookieHeader: string
}

export function toCookieHeader(token: string): string {
  return `cms_session=${token}`
}
