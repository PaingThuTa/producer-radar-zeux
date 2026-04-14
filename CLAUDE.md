# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Instructions for Claude Code
- Do NOT explore or scan the codebase at session start.
- Do NOT read files unless directly needed for the current task.
- Trust this CLAUDE.md as the working architecture summary unless the task requires verification.
- Only open files that are explicitly mentioned in the task.

## Commands

```bash
npm run dev                           # Start dev server on localhost:3000
npm run build                         # Production build
npm run start                         # Run production server
npm run lint                          # ESLint check
npm run lint:fix                      # Auto-fix lint issues
npm run typecheck                     # TypeScript check (repo includes .ts config even though most app code is .js/.jsx)

# Tests
npx jest                              # Run all tests
npx jest "__tests__/file.test.js"    # Run a single test file

# Database
npx prisma migrate dev --name <name>  # Create and apply a migration
npx prisma generate                   # Regenerate Prisma client
npx prisma studio                     # Open Prisma DB GUI
```

## Architecture

This is a Next.js 14 Pages Router app for producer CRM workflows. The UI is a local React dashboard; the backend is a thin set of Next.js API routes backed by Prisma.

- `pages/` is the routing layer for Next.js. `pages/index.jsx` immediately redirects to `/Dashboard`.
- `src/pages/` contains the actual page implementations used by the app shell.
- `pages/api/` exposes REST-style CRUD routes for producer entities and discovery logs, plus `pages/api/discovery/run.js` for YouTube search/enrichment.
- `src/components/layout/AppLayout` wraps every page except `/login`; session state comes from `next-auth` in `pages/_app.jsx`.
- `src/lib/api-client.js` is the shared browser-side CRUD wrapper. Frontend pages call `api.entities.<Model>.<method>()` instead of fetching routes directly.
- `src/lib/db.js` provides the Prisma singleton used by API routes.
- `src/lib/query-client.js` configures a single TanStack Query client with low retry/refetch behavior for this desktop-style workflow app.

## Core Data Flow

The main request path is:

`src/pages/*` → TanStack Query / mutations → `src/lib/api-client.js` → `pages/api/*` → Prisma → PostgreSQL

Three main persisted models drive the app:
- `YouTubeProducer`
- `PlacementProducer`
- `DiscoveryLog`

`YouTubeProducer` and `PlacementProducer` intentionally share nearly the same outreach fields so the same table, modal, bulk-action, and follow-up UI can operate on either source.

## Workflow Model

The app is organized around a single outreach pipeline rather than separate product areas.

- Canonical status flow: `por contactar` → `contactado` → `follow up 1` → `follow up 5` → `archivado`
- Special manual statuses: `connection` and `eliminado`
- `re_dms === 'no'` changes progression rules: initial contact can jump straight to `follow up 4`, and later follow-ups can archive earlier
- `next_follow_up` and `last_action` are the key scheduling fields used throughout Dashboard, Daily Outreach, and Connections views

`src/components/shared/useAutoAdvanceStatus.jsx` advances overdue producers on load and can recycle old archived `re_dms='yes'` records back to `por contactar`, so page loads may trigger writes even without explicit user actions.

## Discovery Pipeline

Discovery is not just a form — it is an ingestion workflow.

- `pages/api/discovery/run.js` calls the YouTube Data API v3 search endpoint, then fetches channel/video metadata in follow-up requests
- Instagram handles are first extracted from channel/video descriptions; missing handles are optionally scraped from the YouTube About page for a small subset
- Discovery pages de-duplicate candidates before persisting them and log run stats into `DiscoveryLog`
- YouTube discovery writes `YouTubeProducer` records with source metadata, priority values, and outreach defaults already set

## UI Structure

The reusable behavior is concentrated in shared components rather than page-local logic.

- `src/components/shared/` contains the producer table, profile/edit modals, CSV import/export, status badges, priority bars, and the auto-advance hook
- `src/components/discovery/` contains the discovery-specific flows
- `src/components/ui/` is the shadcn/Radix component layer

This means producer-management behavior is usually implemented once in shared components and then reused across Dashboard, producer list pages, Connections, and Daily Outreach.

## Key Conventions

- Query cache keys are centered on `['youtube-producers']`, `['placement-producers']`, and `['discovery-logs']`.
- Tests use Jest in a Node environment with `babel-jest`; test files live under `__tests__/` and use `.test.js` names.
- The `@/` alias maps to `src/`.
- `src/pages.config.js` is auto-generated and should not be manually edited except for supported config fields documented inside the file.
- README environment docs are stale: the live Prisma schema uses PostgreSQL, not SQLite. Verify env/setup changes against `prisma/schema.prisma`, not the README.
