# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Instructions for Claude Code
- Do NOT explore or scan the codebase at session start
- Do NOT read files unless directly needed for the current task
- Trust this CLAUDE.md as the complete source of truth for architecture
- Only open files that are explicitly mentioned in the task

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint errors
npx prisma migrate dev --name <name>   # Create + apply a DB migration
npx prisma studio    # GUI for the database
npx jest pages/api/discovery/__tests__/placement.test.js   # Run tests (only test file exists here)
```

## Environment Variables

Required in `.env` or `.env.local`:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `YOUTUBE_API_KEY` — YouTube Data API v3 key
- `GENIUS_TOKEN` — Genius API token for producer scraping
- `NEXTAUTH_SECRET` — NextAuth JWT secret
- `NEXTAUTH_URL` — Base URL (e.g., `http://localhost:3000`)
- `APP_PASSWORD` — Single password for login (no user accounts)

## Architecture

### Framework & Router

Next.js 14 using the **Pages Router** (not App Router). Pages live in two places:
- `pages/` — Next.js route files (API routes + entry points)
- `src/pages/` — React page components imported by `pages/`

The `@/` alias maps to `./src/`, not the root.

### Authentication

Single-password auth via NextAuth (`pages/api/auth/[...nextauth].js`). `middleware.js` protects all routes, redirecting unauthenticated users to `/login`. The session wraps the entire app in `pages/_app.jsx`.

### Data Layer

**Database:** Neon PostgreSQL via Prisma. Three models: `YouTubeProducer`, `PlacementProducer`, `DiscoveryLog`. The Prisma client is a singleton in `src/lib/db.js` to prevent hot-reload connection leaks.

**API pattern (REST):** All entities follow the same shape:
- `GET/POST/DELETE /api/<entity>` — list, create, delete all
- `GET/PUT/DELETE /api/<entity>/[id]` — single record

**Frontend data access:** Use `api.entities.<Entity>` from `src/lib/api-client.js` (never call Prisma from client components). All React pages use TanStack Query (`@tanstack/react-query`) with `queryKey: ['youtube-producers']` / `['placement-producers']` / `['discovery-logs']`.

```js
// Example client usage
import { api as base44 } from '@/lib/api-client';
api.entities.YouTubeProducer.list('-created_date', 5000)
api.entities.YouTubeProducer.create(data)
api.entities.YouTubeProducer.update(id, data)
```

### Producer Types

Two parallel producer pipelines:

| | YouTubeProducer | PlacementProducer |
|---|---|---|
| Source | YouTube search discovery | Song credits (Genius scraping) |
| Priority scale | 1–5 (subscriber-based) | 1–10 (placement quality) |
| Extra fields | `youtube_channel`, `youtube_subscribers`, `video_url` | `song`, `artist` |
| ProducerTable max | 5 | 10 |

**Priority scoring for YouTube:** Purely subscriber-based. Calculated in `src/components/discovery/DiscoveryRunner.jsx`:
- < 1K → 1, 1K–10K → 2, 10K–100K → 3, 100K–500K → 4, 500K+ → 5

**Status pipeline** (shared): `por contactar` → `contactado` → `follow up 1–5` → `archivado`/`eliminado`/`connection`. By default, the tables hide: archivado, eliminado, contactado, follow up 1–5.

### Discovery Flow

**YouTube** — runs in the browser via `src/components/discovery/DiscoveryRunner.jsx`:
1. Calls `POST /api/discovery/run` (server-side proxy to YouTube Data API v3) per batch
2. The API route fetches channel stats + video descriptions in parallel
3. The component dedupes against existing producers (by name and Instagram handle, across both tables)
4. Calculates priority and saves to `YouTubeProducer` via `api.entities.YouTubeProducer.create()`

Instagram is extracted from channel descriptions and video descriptions using regex in `extractInstagramFromDescription()` inside `pages/api/discovery/run.js`.

**Placement (Genius)** — runs via `src/components/discovery/PlacementDiscovery.jsx`:
1. User provides Genius song URLs
2. UI calls `POST /api/discovery/placement` with `{ urls: string[] }`
3. Server searches Genius API for each song, extracts `producer_artists`, fetches each producer's artist profile for `instagram_name`
4. Returns `{ producers, songResults }` with an `isDuplicate` flag — does **not** save automatically
5. User reviews results and selects which to save; UI then calls `api.entities.PlacementProducer.create()` per selection

### Pages

The `pages/` directory holds thin Next.js route files that re-export from `src/pages/`. When adding a new page, you need **both** files:
- `pages/MyPage.jsx` — route entry point (re-exports from `src/pages/MyPage.jsx`)
- `src/pages/MyPage.jsx` — actual React component

Current pages: `Dashboard`, `YouTubeProducers`, `PlacementProducers`, `Discovery`, `DailyContacts`, `MessageGenerator`, `Contacts`, `Connections`.

### Schema — Non-obvious Fields

Both `YouTubeProducer` and `PlacementProducer` share CRM-oriented fields beyond what's displayed in the table:

| Field | Purpose |
|---|---|
| `que_enviar` | What to send (message template notes) |
| `donde_enviar` | Where to send (platform/channel) |
| `re_dms` | Re-DM tracking notes |
| `relacion` | Relationship strength 1–10 |
| `genius_score` | Score derived from Genius placement data |
| `priority_score` | Raw numeric score before clamping to priority |
| `followers_ig` | Instagram follower count |
| `favorite` | Boolean bookmark flag |

### Component Structure

- `src/components/ui/` — shadcn/ui primitives. Do not edit these.
- `src/components/shared/` — Shared producer components (`ProducerTable`, `ProducerProfile`, `BulkActionBar`, `AddProducerDialog`, `CsvImportExport`, `Pagination`, `StatusBadge`)
- `src/components/discovery/` — Discovery UI (`DiscoveryRunner`, `PlacementDiscovery`)
- `src/components/layout/` — `AppLayout` and `Sidebar`

**ProducerTable** is column-configurable. Pass `columns` as an array of keys:
- Available: `name`, `instagram`, `youtube`, `subscribers`, `style`, `placements`, `priority`, `status`, `next_follow_up`, `last_action`, `phone`, `type`
- Set `producerType="youtube"` or `"placement"` to control priority scale display

### Styling

Tailwind CSS with a dark theme. All background/border colors use the zinc palette (`#18181b`, `#27272a`, `#3f3f46`). Use `cn()` from `src/lib/utils.js` to merge class names.
