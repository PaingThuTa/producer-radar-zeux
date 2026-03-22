# Producer Radar

A producer relationship management system for discovering, tracking, and managing outreach to beat producers. Supports dual discovery sources (YouTube type beats + song credits), a status-driven outreach workflow, and bulk contact management — all from a single local app backed by SQLite.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (Pages Router) |
| UI | React 18, Tailwind CSS 3.4, shadcn/ui |
| Animations | Framer Motion |
| Icons | Lucide React |
| State / Data Fetching | TanStack Query v5 |
| ORM | Prisma 5 |
| Database | SQLite (`prisma/dev.db`) |
| Forms | React Hook Form + Zod |
| Notifications | Sonner (toasts) |
| Drag & Drop | @hello-pangea/dnd |
| PDF Export | html2canvas + jsPDF |
| External API | YouTube Data API v3 |

---

## Architecture

```
Browser (React)
    │
    ├── src/pages/          ← Page components (Dashboard, Discovery, etc.)
    ├── src/components/     ← Shared UI components
    └── src/lib/
          ├── api-client.js ← Fetch wrapper (CRUD interface)
          └── db.js         ← Prisma singleton
                │
                ▼
        pages/api/          ← Next.js API routes (REST)
          ├── youtube-producers/[id].js
          ├── placement-producers/[id].js
          ├── discovery-logs/[id].js
          └── discovery/run.js  ← YouTube Data API v3 proxy
                │
                ▼
        Prisma Client
                │
                ▼
        SQLite (prisma/dev.db)
```

### Data Flow

1. React pages call `api.entities.<Model>.<method>()` from `src/lib/api-client.js`
2. The API client makes HTTP requests to Next.js API routes under `pages/api/`
3. API routes use the Prisma singleton (`src/lib/db.js`) to query SQLite
4. TanStack Query caches responses and invalidates on mutation

### State Management

- **Server state**: TanStack Query with manual cache invalidation after every mutation
- **Query keys**: `['youtube-producers']`, `['placement-producers']`, `['discovery-logs']`
- **Local UI state**: `useState` per component (search, filters, selected rows, modals)

---

## Data Model

### `YouTubeProducer`

Producers discovered from YouTube type beat videos.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | CUID primary key |
| `name` | String | Producer name (extracted from video title) |
| `youtube_channel` | String? | Channel name |
| `youtube_channel_url` | String? | Channel URL |
| `youtube_subscribers` | Int? | Subscriber count |
| `video_title` | String? | Source video title |
| `video_url` | String? | Source video URL |
| `instagram` | String? | Instagram handle |
| `email` | String? | Contact email |
| `phone` | String? | Phone number |
| `followers_ig` | Int? | Instagram followers |
| `highlights_placements` | String? | Artist placements |
| `style` | String? | Music style (Juice WRLD, Rod Wave, etc.) |
| `status` | String | Outreach status (default: `por contactar`) |
| `priority` | Int | Priority score 1–8 |
| `next_follow_up` | String? | ISO date for next action |
| `last_action` | String? | ISO date of last contact |
| `re_dms` | String? | Whether re-DMs are accepted (`no` = skip to FU4) |
| `source` | String | `YouTube` or `Manual` |
| `favorite` | Boolean | Starred/favorited |
| `created_date` | DateTime | Creation timestamp |

### `PlacementProducer`

Producers sourced from song credits / placement data.

Same fields as `YouTubeProducer` plus:

| Field | Type | Description |
|-------|------|-------------|
| `song` | String? | Song title |
| `artist` | String? | Artist associated with the placement |

### `DiscoveryLog`

Records of each discovery run.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | CUID primary key |
| `query` | String | Search query used |
| `source` | String? | `YouTube` or `Placement` |
| `status` | String? | `running`, `completed`, `error` |
| `producers_found` | Int | Total videos/credits scanned |
| `producers_added` | Int | New producers created |
| `duplicates_skipped` | Int | Dupes detected and skipped |
| `filtered_out` | Int | Filtered by follower threshold |
| `created_date` | DateTime | Run timestamp |

---

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/youtube-producers` | List producers (`?sort=<field>&limit=<n>`) |
| POST | `/api/youtube-producers` | Create producer |
| GET | `/api/youtube-producers/[id]` | Get single producer |
| PUT | `/api/youtube-producers/[id]` | Update producer |
| DELETE | `/api/youtube-producers/[id]` | Delete producer |
| GET | `/api/placement-producers` | List placement producers |
| POST | `/api/placement-producers` | Create placement producer |
| GET | `/api/placement-producers/[id]` | Get single |
| PUT | `/api/placement-producers/[id]` | Update |
| DELETE | `/api/placement-producers/[id]` | Delete |
| GET | `/api/discovery-logs` | List discovery logs |
| POST | `/api/discovery-logs` | Create log entry |
| GET | `/api/discovery-logs/[id]` | Get single log |
| PUT | `/api/discovery-logs/[id]` | Update log |
| DELETE | `/api/discovery-logs/[id]` | Delete log |
| POST | `/api/discovery/run` | Run YouTube discovery search |

`POST /api/discovery/run` request body:
```json
{ "query": "juice wrld type beat", "maxResults": 15, "pageToken": "<optional>" }
```
Response: `{ "producers": [...], "nextPageToken": "<token|null>" }`

---

## Environment Variables

| Variable | Required | File | Description |
|----------|----------|------|-------------|
| `DATABASE_URL` | Yes | `.env` + `.env.local` | SQLite path: `file:./dev.db` |
| `YOUTUBE_API_KEY` | Yes (for Discovery) | `.env.local` | YouTube Data API v3 key |

Create `.env.local`:
```
DATABASE_URL="file:./dev.db"
YOUTUBE_API_KEY=your_youtube_api_key_here
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local (see above)

# 3. Run database migrations
npx prisma migrate dev --name init

# 4. Start dev server
npm run dev
# → http://localhost:3000
```

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | Auto-fix lint errors |
| `npx prisma migrate dev --name <name>` | Create and apply a migration |
| `npx prisma studio` | Open Prisma DB GUI |

---

## Project Structure

```
producer-radar/
├── pages/                  # Next.js routing
│   ├── _app.js
│   ├── [...slug].js        # Catches all routes → delegates to src/pages/
│   └── api/                # REST API routes
│       ├── youtube-producers/
│       ├── placement-producers/
│       ├── discovery-logs/
│       └── discovery/run.js
├── src/
│   ├── pages/              # React page components
│   │   ├── Dashboard.jsx
│   │   ├── YouTubeProducers.jsx
│   │   ├── PlacementProducers.jsx
│   │   ├── DailyContacts.jsx
│   │   ├── Connections.jsx
│   │   ├── Discovery.jsx
│   │   └── MessageGenerator.jsx
│   ├── components/
│   │   ├── layout/         # AppLayout, Sidebar
│   │   ├── shared/         # ProducerTable, ProducerProfile, AddProducerDialog, ...
│   │   ├── discovery/      # DiscoveryRunner, PlacementDiscovery
│   │   ├── dashboard/      # StatCard
│   │   └── ui/             # shadcn/ui components
│   └── lib/
│       ├── api-client.js   # Fetch wrapper
│       ├── db.js           # Prisma singleton
│       └── utils.js        # cn() and misc helpers
├── prisma/
│   ├── schema.prisma
│   └── dev.db              # SQLite database (gitignored)
└── docs/
    └── WORKFLOW.md         # Tab-by-tab feature reference
```

---

## Workflow Overview

See [`docs/WORKFLOW.md`](docs/WORKFLOW.md) for a detailed breakdown of each tab's functions, data flows, and the full outreach status lifecycle.
