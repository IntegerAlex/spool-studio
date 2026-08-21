# E2E Tests

Playwright suite against a real dev environment (`pnpm test:e2e`).

## Prerequisites

- `DATABASE_URL` in `.env` pointing at a reachable Postgres (the dev Neon
  instance works; no local server required).
- Migrations applied: `pnpm db:migrate` (or rebuild from scratch with
  `npx tsx scripts/fresh-db.ts`).
- Seeded data (specs log in as `admin@libreonix.com` / `password123`):
  `npx tsx --env-file=.env scripts/seed.ts`

## Rate limits

The login limiter (5/min per IP by default) will 429 a full suite run into
flakiness. Start the dev server (manually before `pnpm test:e2e`, so
`reuseExistingServer` picks it up) with loosened limits:

```sh
RATE_LIMIT_LOGIN_MAX=200 RATE_LIMIT_FORGOT_PASSWORD_MAX=200 \
RATE_LIMIT_RESET_PASSWORD_MAX=200 RATE_LIMIT_PORTAL_TOKEN_POST_MAX=200 \
RATE_LIMIT_PORTAL_VIEW_MAX=500 RATE_LIMIT_PORTAL_ACT_MAX=500 pnpm dev
```

All knobs live in `src/lib/rate-limit-config.ts`; unset env keeps production
defaults.

## Known flakiness source

The shared remote Postgres occasionally stalls queries past 10s (login POSTs
then fail with a 500). Specs use generous timeouts and the config retries once;
a rare residual flake that passes standalone is this, not an app bug.

## Notes

- `playwright.config.ts` loads `.env` via `@next/env` so specs can query the
  DB directly (`e2e/db.ts`) for seeding/cleanup.
- Portal specs create their own asset + token rows and clean up after
  themselves; approved assets from interrupted runs may remain.
