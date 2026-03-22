# Producer Radar — CLAUDE.md

## Stack
- **Framework**: Next.js 14 (Pages Router)
- **Database**: Prisma + PostgreSQL via [Neon](https://neon.tech)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: TanStack Query v5
- **API**: Next.js API routes (`pages/api/`)

## Commands
```bash
npm run dev          # start dev server at localhost:3000
npm run build        # production build
npm run start        # production server
npx prisma generate          # regenerate Prisma client after schema changes
npx prisma migrate dev --name <name>   # create + apply a new migration
npx prisma studio    # open DB GUI (uses DATABASE_URL from .env)
```

## Path Aliases
`@/*` resolves to `./src/*`

## Architecture
- `pages/` — Next.js page routes (re-export from `src/pages/`)
- `pages/api/` — API routes (Prisma CRUD + YouTube discovery)
- `src/pages/` — Page components
- `src/components/` — Shared UI components
- `src/components/shared/CsvImportExport.jsx` — CSV import/export (wired into YouTubeProducers + PlacementProducers)
- `src/lib/api-client.js` — Fetch wrapper mirroring base44 entity interface
- `src/lib/db.js` — Prisma singleton
- `prisma/schema.prisma` — DB schema (PostgreSQL)

## Environment Variables

### `.env` — read by Prisma CLI only
```
DATABASE_URL="postgresql://..."
```

### `.env.local` — read by Next.js runtime
```
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL=http://localhost:3000
APP_PASSWORD="..."
YOUTUBE_API_KEY="..."
```

## Local vs Production Database

**Never use the production Neon URL locally.** Use a Neon branch instead:

1. Neon dashboard → your project → **Branches** → **Create branch** (name it `dev`)
2. Copy the dev branch connection string
3. Add it as `DATABASE_URL` in both `.env` and `.env.local`

Local dev/testing (including CSV imports) will hit the dev branch — production data is untouched.

## AI Features (stubbed)
- `MessageGenerator` — returns hardcoded templates; will use OpenRouter when configured
- `DiscoveryRunner.extractContactsWithAI` — returns `{}`; contact enrichment disabled
- `DiscoveryRunner.fetchVideoBatch` — calls `POST /api/discovery/run` (YouTube Data API v3)

## First-time Setup
```bash
npm install
# Add DATABASE_URL (Neon dev branch) to .env and .env.local
npx prisma generate
npm run dev
```
