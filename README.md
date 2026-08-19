# Spool Studio

> Open-source content & asset operations platform for creative teams.

Spool Studio helps agencies and content studios plan, produce, approve, and publish client
content from a single workspace. It combines a **calendar-first planning view**, a
**Kanban production board**, an **approval pipeline**, and a **client-facing portal**
into one tool — backed by PostgreSQL, object storage, and a small, typed REST API.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Biome](https://img.shields.io/badge/Formatted%20with-Biome-60A5FA?logo=biome&logoColor=white)](https://biomejs.dev)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the App](#running-the-app)
- [Scripts](#scripts)
- [Testing](#testing)
- [Architecture](#architecture)
- [API](#api)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Spool Studio is built around the lifecycle of social content for clients:

1. **Plan** — schedule reels, posters, and contract windows on a month/week/day calendar.
2. **Produce** — track assets through a Kanban board from draft to ready-for-review.
3. **Approve** — reviewers approve or request revisions with comments and version history.
4. **Publish** — mark assets published and let clients track progress via a share link.

The application is a single Next.js project (App Router) serving both the
authenticated dashboard and a public, token-scoped client portal. Data lives in
PostgreSQL; media is stored in S3-compatible object storage (e.g. Cloudflare R2);
email notifications go through Mailgun.

---

## Features

- **Calendar planning** — Month / Week / Day views with drag-to-reschedule,
  multi-day contract bars, and recurring publish/upload events.
- **Kanban board** — visual production pipeline per client or team.
- **Asset library** — upload, version, comment, and approve content assets
  (reels & posters) with full revision history.
- **Approval pipeline** — structured approve / reject / revision-requested flow
  with activity logs.
- **Client management** — profiles, targets, references, and branded reports (PDF).
- **Upload queue** — track uploads through processing and into the asset library.
- **Client portal** — share a tokenized, read-only view of a client's assets and
  allow approvals without a login.
- **Notifications & real-time** — in-app notifications and Server-Sent Events
  (SSE) for live updates.
- **Authentication** — email/password with JWT sessions, password reset, and
  team invitations.
- **Audit logging** — activity history across assets and the workspace.

---

## Tech Stack

| Area            | Choice                                                              |
| --------------- | ------------------------------------------------------------------- |
| Framework       | [Next.js 16](https://nextjs.org) (App Router, Turbopack)            |
| UI              | React 19, [Radix UI](https://www.radix-ui.com), Tailwind CSS v4     |
| Language        | TypeScript 5.7                                                      |
| Database        | PostgreSQL (Neon), `pg` driver, custom SQL migration runner         |
| Auth            | JWT (HS512 via `jose`), `bcryptjs` password hashing                 |
| Storage         | S3-compatible (Cloudflare R2) via `@aws-sdk/client-s3`              |
| Email           | Mailgun (`mailgun.js`)                                              |
| Data fetching   | SWR                                                                 |
| Forms           | React Hook Form + Zod                                               |
| Charts          | Recharts                                                            |
| Animation       | Framer Motion                                                       |
| Dates           | date-fns, react-day-picker                                          |
| PDF             | `@react-pdf/renderer`                                               |
| Lint / Format   | [Biome](https://biomejs.dev) v2                                     |
| Tests           | Vitest (unit/integration), Playwright (end-to-end)                  |
| Analytics       | `@vercel/analytics`                                                 |

---

## Project Structure

```text
spool-studio/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Login & password recovery
│   ├── (portal)/               # Public, token-based client sharing
│   ├── api/                    # Route handlers (REST + SSE)
│   ├── dashboard/              # Authenticated app
│   │   ├── calendar/           # Month / week / day planning
│   │   ├── kanban/             # Production board
│   │   ├── queue/              # Upload queue
│   │   ├── approvals/          # Approval pipeline
│   │   ├── assets/             # Asset library & detail
│   │   ├── clients/            # Client management
│   │   ├── notifications/      # In-app notifications
│   │   ├── logs/               # Activity / audit logs
│   │   └── settings/           # Workspace settings
│   ├── layout.tsx
│   └── page.tsx
├── src/
│   ├── components/             # UI primitives & feature components
│   ├── lib/                    # db, auth, s3, mailgun, calendar helpers
│   └── types/                  # Generated database types
├── scripts/                    # Migrations, seed & DB tooling
│   ├── migrate.ts              # Migration runner
│   ├── seed.ts                 # Demo/seed data
│   ├── fresh-db.ts             # Reset the database
│   └── *.sql                   # Versioned SQL migrations
├── public/                     # Static assets
├── biome.json                  # Lint & format configuration
├── tailwind.config.ts
├── next.config.*               # Next.js configuration
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.9 (Next.js 16 requirement)
- A **PostgreSQL** database (a free [Neon](https://neon.tech) instance works well)
- (Optional) **Cloudflare R2** or any S3-compatible bucket for media storage
- (Optional) **Mailgun** account for email notifications

### Installation

```bash
# Clone the repository
git clone <your-fork-or-repo-url> spool-studio
cd spool-studio

# Install dependencies
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable                   | Required | Description                                              |
| -------------------------- | -------- | -------------------------------------------------------- |
| `DATABASE_URL`             | ✅       | PostgreSQL connection string (Neon pooler recommended).  |
| `JWT_SECRET`               | ✅       | Secret used to sign HS512 JWTs. **Use a long random value in production.** |
| `R2_ENDPOINT`              | ⚠️\*     | S3-compatible endpoint for media storage.                |
| `R2_ACCESS_KEY_ID`         | ⚠️\*     | Access key for object storage.                           |
| `R2_SECRET_ACCESS_KEY`     | ⚠️\*     | Secret key for object storage.                           |
| `R2_BUCKET_NAME`           | ⚠️\*     | Bucket name (default `asset-flow`).                      |
| `R2_PUBLIC_URL`            | ⚠️\*     | Public base URL for served media.                        |
| `R2_REGION`                | ⚠️\*     | Bucket region (default `us-east-1`).                     |
| `MAILGUN_API_KEY`          | ⚠️\*\*   | Mailgun API key for transactional email.                 |
| `MAILGUN_DOMAIN`           | ⚠️\*\*   | Verified Mailgun sending domain.                         |
| `MAILGUN_FROM`             | ⚠️\*\*   | From address, e.g. `Spool Studio <noreply@example.com>`.          |
| `MAIL_NOTIFICATION_TO`     | ⚠️\*\*   | Default recipient for internal notifications.             |
| `NEXT_PUBLIC_APP_URL`      | ✅       | Public app URL (used in emails/links).                   |
| `NODE_ENV`                 | ✅       | `development` or `production`.                           |

\* Required for uploads/media. The app runs without it, but asset storage will be disabled.
\*\* Required for email (password reset, notifications).

> Additional integrations (e.g. web push) may require extra variables — see the
> relevant `app/api/*` handlers for details.

### Database Setup

Migrations are plain SQL files tracked in a `_migrations` table. Apply them with
the included runner (uses a TypeScript-aware Node runtime, e.g. `tsx` or
`node --experimental-strip-types` on Node ≥ 22):

```bash
# Apply all pending migrations
npx tsx scripts/migrate.ts

# (Optional) Seed demo data — workspace, clients, users, and sample assets
npx tsx scripts/seed.ts
```

To wipe everything and start fresh (drops all tables):

```bash
npx tsx scripts/fresh-db.ts
```

### Running the App

```bash
# Development (Turbopack)
npm run dev

# Production build & start
npm run build
npm start
```

Open <http://localhost:3000>.

---

## Scripts

| Script                | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `npm run dev`         | Start the dev server with Turbopack.                 |
| `npm run build`       | Create a production build.                           |
| `npm run start`       | Serve the production build.                          |
| `npm run lint`        | Lint and format-check with Biome.                    |
| `npm run format`      | Auto-format the codebase with Biome.                 |
| `npm run typecheck`   | Run `tsc --noEmit`.                                  |
| `npm run test`        | Run the unit/integration suite (Vitest).             |
| `npm run test:watch`  | Run Vitest in watch mode.                            |
| `npm run test:e2e`    | Run end-to-end tests (Playwright).                   |
| `npx tsx scripts/migrate.ts` | Apply database migrations.                    |
| `npx tsx scripts/seed.ts`    | Seed demo data.                              |

---

## Testing

- **Unit / integration** — Vitest, with API route tests under `app/api/**/__tests__`:

  ```bash
  npm run test
  ```

- **End-to-end** — Playwright. First install browsers, then run:

  ```bash
  npx playwright install
  npm run test:e2e
  ```

- **Quality gates** — Biome (lint + format) and `tsc` typechecking:

  ```bash
  npm run lint
  npm run typecheck
  ```

---

## Architecture

- **Routing & rendering** — Next.js App Router. Server Components fetch data
  where possible; client components handle interactivity (calendar drag, forms).
- **API** — Route handlers under `app/api/*` expose a typed REST surface plus
  SSE endpoints for real-time updates. Handlers authenticate via JWT and scope
  data to the requesting user's workspace.
- **Data model** — Core entities: `users`, `workspaces`, `team_members`,
  `clients`, `content_assets`, `asset_revisions`, `asset_comments`,
  `asset_activity_logs`, `upload_queue`, `portal_tokens`, plus audit logs.
  Types are centralized in `src/types/database.ts`.
- **Storage** — Media is uploaded through presigned sessions to S3-compatible
  storage; metadata is stored in PostgreSQL. `s3rver` can emulate S3 locally.
- **Calendar** — Events are derived from three sources (contracts → `clients`,
  publishes/approvals → `content_assets`, uploads → `upload_queue`) and merged
  into a single normalized event list rendered across month/week/day views.
  Recurrence is expanded client-side from a `recurrence` JSON column.

---

## API

The API is organized by domain under `app/api`:

| Domain        | Endpoints (examples)                                                        |
| ------------- | --------------------------------------------------------------------------- |
| Auth          | `auth/login`, `auth/register`, `auth/logout`, `auth/forgot-password`, `auth/reset-password`, `auth/change-password`, `auth/invite`, `auth/me` |
| Users         | `users`, `users/[id]`, `users/me`, `users/search`                           |
| Workspace     | `workspace`                                                                 |
| Clients       | `clients`, `clients/[id]`, `clients/[id]/references`, `clients/[id]/report` (`/pdf`) |
| Assets        | `assets`, `assets/[id]`, `assets/[id]/upload`, `assets/approve`, `assets/reject`, `assets/[id]/revisions`, `assets/[id]/comments`, `assets/[id]/activity` |
| Calendar      | `calendar`                                                                  |
| Kanban        | `kanban/board`                                                              |
| Queue         | `queue`, `queue/[id]`                                                       |
| Uploads       | `uploads/r2-session`, `uploads/google-session`                              |
| Portal        | `portal/token`, `portal/[token]`, `portal/[token]/assets/[id]/approve`      |
| Notifications | `notifications`, `notifications/[id]`, `notifications/mark-all-read`, `settings/notifications` |
| Push          | `push/subscribe`, `push/send`, `push/unsubscribe`                           |
| Real-time     | `events/stream` (SSE), `perf`                                               |
| Misc          | `logs`, `dashboard/summary`                                                 |

All authenticated endpoints expect a valid `Authorization: Bearer <token>` header.

---

## Roadmap

- [ ] Email/reminder notifications (Tier 4) — password-reset & digest emails.
- [ ] Recurring **contracts** (currently recurrence applies to publishes/uploads).
- [ ] Multi-day bars in Week/Day views (currently Month-only).
- [ ] Richer calendar filters (assignee, status) and iCal export/import.
- [ ] CI pipeline (typecheck + lint + test) and preview deployments.
- [ ] Self-host docs & Dockerfile.

See the [issue tracker](../../issues) for planned work and to propose features.

---

## Contributing

Contributions are welcome! This project uses **Biome** for linting/formatting and
**Conventional Commits**-style messages.

1. Fork the repository and create a feature branch.
2. Install dependencies and set up your `.env` (see [Getting Started](#getting-started)).
3. Make your changes, keeping tests and types green:

   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```

4. Commit with a clear message and open a pull request.

Please open an issue first for significant changes so we can discuss the approach.

---

## License

Released under the [GNU Affero General Public License v3 (AGPL-3.0)](./LICENSE). See [LICENSE](./LICENSE) for details.
