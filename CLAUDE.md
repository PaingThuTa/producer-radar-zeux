# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint errors

# Tests (files must be in __tests__/ with .test.js extension)
npx jest                              # Run all tests
npx jest __tests__/genius-parser      # Run a single test file

# Database
npx prisma migrate dev --name <name>  # Create and apply a migration
npx prisma studio                     # Open DB GUI
```

## Architecture

**Next.js 14 Pages Router** app with two parallel page directories:

- `pages/` — Next.js routing layer. `pages/index.jsx` redirects to `/Dashboard`. All page components live in `src/pages/` and are imported by corresponding files in `pages/`.
- `pages/api/` — REST API routes. Each entity has `index.js` (list/create/deleteAll) and `[id].js` (get/update/delete).
- `src/pages/` — React page components: Dashboard, YouTubeProducers, PlacementProducers, DailyContacts, Connections, Discovery, MessageGenerator, Contacts.
- `src/components/` — UI split into `layout/`, `shared/`, `discovery/`, `dashboard/`, `ui/` (shadcn).
- `src/lib/` — Core utilities: `api-client.js` (fetch wrapper), `db.js` (Prisma singleton), `normalizeStatus.js` (CSV import normalization), `query-client.js` (TanStack Query instance).

**Data flow**: React pages → `api.entities.<Model>.<method>()` in `src/lib/api-client.js` → Next.js API routes → Prisma → SQLite (`prisma/dev.db`).

**State**: TanStack Query v5 for server state (`['youtube-producers']`, `['placement-producers']`, `['discovery-logs']` cache keys). Local UI state (`useState`) for search, filters, modals, and selected rows.

## Data Models

Two producer types share the same status/outreach pipeline:

- **`YouTubeProducer`** — discovered from YouTube type beat videos via YouTube Data API v3
- **`PlacementProducer`** — sourced from song credits; adds `song` and `artist` fields

**Status lifecycle** (`por contactar` → `contactado` → `follow up 1–5` → `archivado`). Special statuses: `connection` (shown in Connections tab), `eliminado`. Auto-advance logic runs on page load via `useAutoAdvanceStatus` hook in Dashboard and Daily Outreach — producers with `next_follow_up <= today` and status `contactado` advance automatically.

**`re_dms` field**: when set to `no`, skips from `contactado` directly to `follow up 4`, and from `follow up 4` directly to `archivado`.

**Priority scoring** (1–8): computed during YouTube Discovery as weighted sum of placement, IG followers, and YouTube subscriber scores.

## Key Conventions

- **CSV import**: `normalizeStatus` in `src/lib/normalizeStatus.js` maps non-standard status values (e.g., `Contactado/48h`, `FOLLOW UP 3`) to canonical values before writing records.
- **Environment**: Requires `DATABASE_URL="file:./dev.db"` and `YOUTUBE_API_KEY` in `.env.local`.
- **Tests**: Jest with Babel, node environment. Test files go in `__tests__/` with `.test.js` extension. Path alias `@/` maps to `src/`.
- **`src/pages.config.js`** is auto-generated — do not manually edit the `PAGES` object.
