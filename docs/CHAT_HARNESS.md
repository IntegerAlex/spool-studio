# Spool AI — "Ask Spool" Chat Harness

A secure, provider-agnostic chat assistant that lets a user drive the app
conversationally ("move this asset to review", "show approvals for client X").
It is **not** a shortcut around authorization: every action still flows through
the existing `app/api/**` routes using the requesting user's own session.

## Architecture

```
browser (Ask Spool widget)
   │ useChat (Vercel AI SDK @ai-sdk/react)
   ▼
POST /api/chat                         app/api/chat/route.ts
   │ 1. requireUser()                  (session/JWT)
   │ 2. guardUserInput()               injection pre-filter
   │ 3. resolve user's OWN AI settings (encrypted key, decrypted here only)
   │ 4. buildSystemPrompt(role)
   │ 5. buildToolSet(ctx)              role-gated tool registry
   ▼
streamText(model, tools)               ai SDK (Anthropic/OpenAI)
   │ tool.execute(input)
   ▼
src/lib/chat/tools/*.ts ──► callInternalApi(path, { cookieHeader })   src/lib/chat/internal-api.ts
                                │ forwards the caller's cms_session cookie
                                ▼
                        existing app/api/** route
                                │ runs its normal auth + RBAC
                                ▼ 403 ─► AccessDeniedError ─► calm "you don't have access" reply
```

Key invariant: **the chat/tool layer never imports `src/repositories` or
Drizzle.** Data access reuses the internal HTTP API with the caller's own
cookie, so every existing authz check is applied rather than reimplemented.

## Directory map

| Path | Purpose |
|------|---------|
| `app/api/chat/route.ts` | Chat endpoint (streaming, guardrails, per-user model) |
| `app/api/user/ai-settings/route.ts` | Per-user provider config GET/PUT/DELETE (encrypted) |
| `src/lib/chat/internal-api.ts` | Safe `fetch` to allow-listed `/api/*` routes + `AccessDeniedError` |
| `src/lib/chat/provider.ts` | Provider-agnostic model factory |
| `src/lib/chat/guardrails.ts` | Injection pre-filter, tool→role gate, data-block markers |
| `src/lib/chat/system-prompt.ts` | Role-aware, cached system prompt |
| `src/lib/chat/summarize.ts` | List pagination for compact tool results |
| `src/lib/chat/audit.ts` | Structured, secret-free audit logging |
| `src/lib/chat/tools/*.ts` | One factory per tool; thin wrappers over internal routes |
| `src/lib/chat/crypto.ts` | AES-256-GCM encrypt/decrypt of API keys at rest |
| `src/repositories/user-ai-settings-repository.ts` | DB access for user AI settings |
| `src/services/user-ai-settings-service.ts` | Encrypt/decrypt/mask + validation |
| `src/db/schema/user-ai-settings.ts` | `user_ai_settings` table |
| `components/chat/ask-spool/*` | Floating launcher, panel, message, input |
| `app/dashboard/ai/page.tsx` | Per-user AI settings UI |
| `stores/chat-store.ts` | Widget open/close (session scoped) |

## Security model

1. **No direct DB access** — tools call internal routes with the user's cookie.
2. **RBAC fail-closed** — `buildToolSet` only includes tools the role may use
   (`guardrails.allowedToolNames`). If the underlying route returns `403`,
   `callInternalApi` throws `AccessDeniedError`, which is never treated as a
   generic error. The reply is the fixed string
   `DENIAL_MESSAGE` ("You don't have access to do that …") — no *why*, no hint
   that another user's resource exists, no retry with elevated scope.
3. **Prompt-injection defense**
   - User prompts pass `guardUserInput` (instruction-override / role-override /
     prompt-exfil / delimiter-escape / encoded-payload heuristics). Blocks are
     returned as a neutral "please rephrase" 400.
   - Tool output is framed as untrusted data. The system prompt states that
     content inside data markers is data, never instructions, and that
     directives found there must be ignored.
   - Only allow-listed tool names exist in the schema; invented/unknown tool
     names cannot execute.
   - The internal client only ever hits allow-listed local `/api/*` paths — no
     arbitrary URLs, no raw SQL, no model-constructed fetch targets.
4. **Audit** — tool usage / blocked input / denials go through `logChatAudit`
   with stable reason codes; never secrets, tokens, or raw message bodies.
5. **Keys at rest** — per-user provider keys are encrypted (AES-256-GCM) with a
   key derived from `JWT_SECRET`. The API returns only a masked preview
   (`sk-…XyZ`); the plaintext exists only in a request-scoped decrypt inside the
   chat route. Users rotate/delete their own key from Settings → Ask Spool AI.

## Per-user AI configuration

There is no shared billing key. Each user connects their own provider/model/key
under **Settings → Ask Spool AI** (`/dashboard/ai`) or the SYSTEM sidebar entry.
The chat route resolves that user's encrypted settings per request, falling
back to the optional `AI_PROVIDER`/`OPENAI_API_KEY`/`ANTHROPIC_API_KEY` env
vars only when a user hasn't configured one.

## Prompt caching

For Anthropic, the chat route tags the stable prefix (system prompt + tool
schemas) with `cache_control: { type: "ephemeral" }` so repeated turns reuse
cached static tokens. OpenAI caches automatically on stable prefixes. Confirm
cache hits via the provider's response metadata on the 2nd+ turn of a session.
Long tool results are paginated/compacted (`summarize.ts`) so context stays
small.

## Adding a new tool safely

1. **Add a tool factory** in `src/lib/chat/tools/<name>.ts` that returns an
   AI SDK `tool({ description, inputSchema, execute })`. `execute` calls
   `callInternalApi("/api/<route>", { cookieHeader: ctx.cookieHeader, ... })`
   and maps the response to a **compact summary** (id + title/status, never a
   full blob). Treat every field you return as untrusted data.
2. **Register it** in `src/lib/chat/tools/index.ts` (`buildToolSet`).
3. **Grant permissions** in `src/lib/chat/guardrails.ts`
   (`TOOL_PERMISSION_MAP[<name>] = [permission(s)]`). Only roles holding those
   permissions see the tool. If in doubt, restrict more, not less.
4. Never import repositories/Drizzle or a service-role credential into the tool.
   If the tool must act on a resource, call the route for it — don't reach
   around the API.

## Frontend notes

The widget uses `useChat` (`@ai-sdk/react`) with a `DefaultChatTransport` that
posts to `/api/chat` and reads the UIMessage stream, so text streams
token-by-token and tool parts surface as inline cards. Open/close state lives in
`stores/chat-store.ts` (session scoped — resets on logout). Per-user config is
loaded via TanStack Query. No chat library/Redux was introduced.

## Testing

- Unit: `src/lib/chat/__tests__/{crypto,guardrails,internal-api}.test.ts`
  (encryption round-trip/tamper, injection patterns, role gating, path
  allow-listing, `AccessDeniedError`).
- Run: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- A two-user RBAC denial scenario and end-to-end streaming belong in a Playwright
  spec under `e2e/` when a live provider key is available.
