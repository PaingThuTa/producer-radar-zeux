# Producer Radar — CLAUDE.md

## Stack
- **Framework**: Next.js 14 (Pages Router)
- **Database**: Prisma + SQLite (`prisma/dev.db`)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: TanStack Query v5
- **API**: Next.js API routes (`pages/api/`)

## Commands
```bash
npm run dev          # start dev server at localhost:3000
npm run build        # production build
npm run start        # production server
npx prisma migrate dev --name <name>   # create migration
npx prisma studio    # open DB GUI
```

## Path Aliases
`@/*` resolves to `./src/*`

## Architecture
- `pages/` — Next.js page routes (re-export from `src/pages/`)
- `pages/api/` — API routes (Prisma CRUD + YouTube discovery)
- `src/pages/` — Page components
- `src/components/` — Shared UI components
- `src/lib/api-client.js` — Fetch wrapper mirroring base44 entity interface
- `src/lib/db.js` — Prisma singleton
- `prisma/schema.prisma` — DB schema

## Environment Variables
- `.env` — `DATABASE_URL` (read by Prisma CLI)
- `.env.local` — `YOUTUBE_API_KEY`, `DATABASE_URL` (read by Next.js runtime)

## AI Features (stubbed)
- `MessageGenerator` — returns hardcoded templates; will use OpenRouter when configured
- `DiscoveryRunner.extractContactsWithAI` — returns `{}`; contact enrichment disabled
- `DiscoveryRunner.fetchVideoBatch` — calls `POST /api/discovery/run` (YouTube Data API v3)

## First-time Setup
```bash
npm install
npx prisma migrate dev --name init
npm run dev
```
