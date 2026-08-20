# Spool Studio

Open-source content and asset operations platform for creative teams.

Spool Studio is a workspace for agencies and content teams to plan, produce, review, approve, and publish client content.

It includes a content calendar, Kanban production board, asset library, approval workflow, upload queue, and client portal.

## Features

### Calendar

- Month, week, and day views
- Drag-to-reschedule
- Recurring publish and upload events
- Multi-day client contract periods
- Combined view of contracts, content, and uploads

### Production

- Kanban board for content production
- Status tracking from draft through approval
- Client and team views
- Upload queue with processing states
- Retry and cancellation for queued uploads

### Assets

- Central asset library
- Reel and poster support
- Uploads and downloads
- Asset versions and revision history
- Comments and activity history
- Asset previews

### Approvals

- Approve or reject assets
- Request revisions
- Comments on individual assets
- Approval history
- Activity logging

### Client Portal

The client portal provides a token-based, read-only interface for reviewing content.

Clients can:

- View assets
- Preview content
- Leave comments
- Approve assets
- Request revisions
- View revision history

No client account is required.

### Other

- JWT authentication
- Password reset
- Team invitations
- In-app notifications
- Server-Sent Events (SSE)
- S3-compatible object storage
- Mailgun email notifications
- PDF client reports
- Workspace activity logs

## Tech Stack

| Area           | Technology                                  |
| -------------- | ------------------------------------------- |
| Framework      | Next.js 16, App Router                      |
| UI             | React 19, Tailwind CSS v4, Radix UI         |
| Language       | TypeScript 5.7                              |
| Database       | PostgreSQL 15+                              |
| ORM            | Drizzle ORM                                 |
| Authentication | jose, bcryptjs                             |
| Storage        | S3-compatible storage / Cloudflare R2       |
| Email          | Mailgun                                     |
| Data Fetching  | SWR                                         |
| Forms          | React Hook Form                             |
| Validation     | Zod                                         |
| Charts         | Recharts                                    |
| Animation      | Framer Motion                               |
| PDF            | @react-pdf/renderer                         |
| Testing        | Vitest, Playwright                          |
| Formatting     | Biome                                       |
| Linting        | Biome, oxlint                               |

## Project Structure

```
spool-studio/
├── app/
│   ├── (auth)/             # Authentication
│   ├── (portal)/           # Client portal
│   ├── api/                # API routes and SSE
│   └── dashboard/          # Authenticated application
│       ├── calendar/
│       ├── kanban/
│       ├── queue/
│       ├── approvals/
│       ├── assets/
│       ├── clients/
│       ├── notifications/
│       ├── logs/
│       └── settings/
├── src/
│   ├── components/
│   ├── lib/
│   └── types/
├── scripts/
├── public/
├── biome.json
├── tailwind.config.ts
├── next.config.*
└── package.json
```

## Getting Started

### Requirements

- Node.js 20.9+
- Node.js 24.x for oxlint
- PostgreSQL 15+
- pnpm

Cloudflare R2 or another S3-compatible provider is required for asset storage.

Mailgun is required for email functionality.

### Installation

```bash
git clone <your-repo-url> spool-studio
cd spool-studio

pnpm install
```

Create the environment file:

```bash
cp .env.example .env
```

Configure the required variables:

```
DATABASE_URL=
JWT_SECRET=
NEXT_PUBLIC_APP_URL=
```

Storage and email variables are listed in `.env.example`.

### Database

Run migrations:

```bash
pnpm db:migrate
```

Seed development data if needed:

```bash
npx tsx scripts/seed.ts
```

To reset the database:

```bash
npx tsx scripts/fresh-db.ts
```

This removes all existing tables and recreates them from the migration history.

### Development

```bash
pnpm dev
```

The application runs at:

```
http://localhost:3000
```

### Production

```bash
pnpm build
pnpm start
```

## Scripts

| Command                        | Description                          |
| ------------------------------ | ------------------------------------ |
| `pnpm dev`                     | Start the development server         |
| `pnpm build`                   | Create a production build            |
| `pnpm start`                   | Start the production server          |
| `pnpm lint`                    | Run Biome checks                     |
| `pnpm format`                  | Format the codebase                  |
| `pnpm typecheck`               | Run TypeScript checks                |
| `pnpm test`                    | Run Vitest                           |
| `pnpm test:watch`              | Run Vitest in watch mode             |
| `pnpm test:e2e`                | Run Playwright                       |
| `pnpm db:migrate`              | Apply database migrations            |
| `pnpm db:init`                 | Initialize the migration journal     |
| `npx tsx scripts/seed.ts`      | Seed development data                |
| `npx tsx scripts/fresh-db.ts`  | Reset the database                   |

## Testing

Unit and integration tests use Vitest:

```bash
pnpm test
```

End-to-end tests use Playwright:

```bash
npx playwright install
pnpm test:e2e
```

Run the main checks before submitting changes:

```bash
nvm use 24

pnpm lint
npx oxlint
pnpm typecheck
pnpm test
```

## Roadmap

- [ ] Recurring contracts
- [ ] Multi-day events in week/day calendar views
- [ ] Calendar filters
- [ ] iCal import/export
- [ ] Expanded email notifications
- [ ] CI pipeline
- [ ] Preview deployments
- [ ] Self-hosting documentation
- [ ] Docker support

See the issue tracker for current work and feature requests.

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Install dependencies and configure `.env`.
4. Make your changes.
5. Add or update tests where appropriate.
6. Run the lint, typecheck, and test commands.
7. Open a pull request.

For larger changes, open an issue before starting implementation so the proposed approach can be discussed.

Use clear commit messages and keep pull requests focused on a single change.

## License

Spool Studio is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

See [LICENSE](./LICENSE) for the full license text.
