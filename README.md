<p align="center">
  <img src="public/Spool_Bg.png" alt="Spool Studio" width="480" />
</p>

# Spool Studio

[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](./LICENSE)
![Node.js 24+](https://img.shields.io/badge/node-24%2B-339933.svg)
![TypeScript 5.7](https://img.shields.io/badge/typescript-5.7-3178c6.svg)
![Tests](https://img.shields.io/badge/tests-175%20passed-brightgreen.svg)

Content and asset operations platform for creative teams.

Plan, produce, review, approve, and publish client content from a single workspace. Built for agencies managing multiple clients with recurring content cycles.

## Features

**Calendar** — Month, week, and day views with drag-to-reschedule. Overlays client contract periods, content assets, and upload queue items. Supports recurring events.

**Kanban Board** — Drag-and-drop content production pipeline. Track status from draft through approval. Filter by client or team member.

**Asset Library** — Central repository for reels and posters. Upload, download, version history, comments, and activity logs. Inline previews.

**Approval Workflow** — Approve, reject, or request revisions on assets. Comment threads per asset. Full approval history with activity logging.

**Client Portal** — Token-based, read-only interface for clients to review assets, leave comments, approve or request revisions. No client account required.

**Content Planner** — Service cycles with weekly content plans. Automated asset numbering and publication records.

**Upload Queue** — Scheduled uploads with R2 presigned URLs. Processing states, retry, and cancellation.

**Dashboard** — Command palette search (Ctrl/Cmd+K), notifications bell with unread badge, global search across clients and assets.

**Auth & Security** — JWT with token versioning, password reset, team invitations, rate limiting, security headers, report-only CSP. Portal tokens are hashed at rest.

**Notifications** — In-app notifications via SSE. Email through Mailgun. Per-user preference controls.

**Reporting** — PDF client reports with asset summaries and publication history.

**Ask Spool AI** — A secure, conversational assistant that drives the app
("move this asset to review", "show approvals for client X"). Each user
connects their own AI provider/model/key (encrypted at rest, managed from
Settings → Ask Spool AI). Chat never bypasses authorization — every action
flows through the existing API with the user's own session, with injection
guardrails and RBAC that fails closed. See `docs/CHAT_HARNESS.md`.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, Radix UI |
| Language | TypeScript 5.7 |
| Database | PostgreSQL 15+ |
| ORM | Drizzle ORM |
| Auth | jose, bcryptjs |
| Storage | Cloudflare R2 (S3-compatible) |
| Email | Mailgun |
| Data Fetching | TanStack React Query |
| AI Assistant | Vercel AI SDK (`ai` 7), provider-agnostic (OpenAI / Anthropic) |
| Forms | React Hook Form, Zod |
| Charts | Recharts |
| PDF | @react-pdf/renderer |
| Testing | Vitest, Playwright |
| Linting | Biome, oxlint (anti-slop plugin) |

## Getting Started

### Requirements

- Node.js 24+ (needed for oxlint anti-slop plugin)
- PostgreSQL 15+
- pnpm

### Install

```bash
git clone <your-repo-url> spool-studio
cd spool-studio
pnpm install
```

### Environment

```bash
cp .env.example .env
```

Required variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `NEXT_PUBLIC_APP_URL` | Public URL (e.g. `http://localhost:3000`) |

Optional — storage, email, and debug variables are listed in `.env.example`.

For Ask Spool AI there is no shared API key: each user connects their own
provider/model/key from **Settings → Ask Spool AI** (`/dashboard/ai`). Keys are
encrypted at rest (AES-256-GCM, derived from `JWT_SECRET`) and only ever shown
masked. Optional `AI_PROVIDER` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` env vars
act only as a server fallback for users without a configured key.

### Database

```bash
pnpm db:migrate
```

Seed development data (3 users, 2 clients, 14 assets):

```bash
npx tsx scripts/seed.ts
```

Reset the database completely:

```bash
npx tsx scripts/fresh-db.ts
```

### Develop

```bash
pnpm dev
```

Open `http://localhost:3000`.

### Build

```bash
pnpm build
pnpm start
```

## Testing

Unit and integration tests (Vitest — 21 files, 175 tests):

```bash
pnpm test
```

End-to-end tests (Playwright — 8 spec files):

```bash
npx playwright install
pnpm test:e2e
```

Before submitting changes, run the full check suite:

```bash
nvm use 24
pnpm lint
npx oxlint
pnpm typecheck
pnpm test
```

## Project Structure

```
src/
  db/             Drizzle schema and migrations client
  lib/            Core utilities (auth, email, storage, RBAC, etc.)
    chat/         Ask Spool AI harness (guardrails, tools, crypto, provider)
  repositories/   Data access layer
  services/       Business logic
  types/          Shared TypeScript types
  actions/        Server actions
  integrations/   External service clients (R2, Mailgun)

app/
  (auth)/         Login, forgot-password
  (portal)/       Client portal (token-based)
  dashboard/      Main app (calendar, assets, kanban, ai, etc.)
  api/            Route handlers (incl. chat/ and user/ai-settings/)

components/       React components (ui/, layout/, assets/, chat/ask-spool/, etc.)
e2e/              Playwright end-to-end tests
drizzle/          Migration SQL files
scripts/          Database and maintenance scripts
tools/            Build and lint tooling (oxlint anti-slop plugin)
```

Architecture and security notes for the AI assistant live in
[`docs/CHAT_HARNESS.md`](./docs/CHAT_HARNESS.md).

## Contributing

1. Fork and create a feature branch.
2. Install dependencies and configure `.env`.
3. Make changes with tests where appropriate.
4. Run `pnpm lint`, `npx oxlint`, `pnpm typecheck`, `pnpm test`.
5. Open a pull request.

For larger changes, open an issue first to discuss the approach.

## License

AGPL-3.0 — see [LICENSE](./LICENSE).
