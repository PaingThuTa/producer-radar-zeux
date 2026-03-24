# Producer Radar — Tab Workflow Reference

Complete breakdown of every tab: what it does, what data it loads, and what actions are available.

---

## Status Lifecycle

All producers (YouTube and Placement) move through a shared status pipeline:

```
por contactar
    │
    │  [Mark "Enviado" in Daily Outreach]
    ▼
contactado  (+1 day next_follow_up)
    │         (if re_dms=no → skip to follow up 4 +7d)
    │  [next_follow_up date arrives → auto-advance]
    ▼
follow up 1  (+7 days)
    │
    ▼
follow up 2  (+7 days)
    │
    ▼
follow up 3  (+7 days)
    │
    ▼
follow up 4  (+7 days)
    │         (if re_dms=no → skip to archivado)
    ▼
follow up 5  (+7 days)
    │
    ▼
archivado  (no further action)

Special statuses (set manually):
  connection  — active real relationship (shown in Connections tab)
  eliminado   — removed/disqualified
```

**Auto-advance logic** (`useAutoAdvanceStatus` hook): runs on page load in Dashboard and Daily Outreach. For each producer with `next_follow_up <= today` and status `contactado`, it advances to the next follow-up step automatically.

**CSV import normalization** (`normalizeStatus` in `src/lib/normalizeStatus.js`): applied automatically during CSV import (both in the mapping preview and on save). Non-standard values are mapped before any record is written:

| Raw CSV value | Normalized to |
|---------------|---------------|
| `Contactado/48h`, `contactado/24h`, `CONTACTADO/72h`, etc. | `contactado` |
| `FOLLOW UP 3`, `Follow Up 5`, etc. | `follow up 3`, `follow up 5`, etc. |
| Any already-valid status | unchanged (lowercased) |
| Anything unrecognized | `por contactar` |

---

## Priority Scoring

Applied during YouTube Discovery to rank producers automatically.

```
Priority = (Placement Score × 0.6) + (IG Followers Score × 0.2) + (YouTube Subscribers Score × 0.2)
           + Contact Bonus
```

| Component | Formula |
|-----------|---------|
| Placement Score | Drake/Juice WRLD/etc → 10, Polo G/Rod Wave → 8, Toosii/Morray → 5, any placements → 3 |
| IG Followers Score | <50 → 0, <1k → 2, <5k → 5, <10k → 7, <15k → 8, ≥15k → 9 |
| YouTube Subscribers Score | <100 → 0, <5k → 2, <20k → 4, <50k → 6, <100k → 8, ≥100k → 10 |
| Contact Bonus | IG + Email → +0.8, IG only → +0.3, neither → -0.5 |

Final score clamped to range 1–10.

---

## Dashboard

**Purpose:** High-level overview of the entire pipeline. Shows today's tasks and key metrics.

**Data loaded:**
- YouTube producers (last 100, sorted by created_date desc)
- Placement producers (last 100, sorted by created_date desc)
- Discovery logs (last 10)

**Stat Cards:**

| Card | Logic |
|------|-------|
| Discovered Today | YouTube producers created today (by `created_date`) |
| High Priority | All producers across both types with `priority >= 7` |
| Contacted | All producers with `status = 'contactado'` |
| Follow Ups | Producers with `status` starting with `'follow up'` AND `next_follow_up <= today` |

**Sections:**

| Section | Description |
|---------|-------------|
| Top Priority Producers | Top 5 by priority score across both types, shows name/status/priority bar |
| Daily DMs | Top 8 uncontacted (`por contactar`), sorted by priority. Click Instagram to open profile |
| Daily Follow Ups | Producers with `next_follow_up = today` and follow-up status. "Hecho" advances status |
| Recent Discovery Logs | Last 10 runs showing query, source, producers found/added |
| Network Overview | Totals: YouTube count, Placement count, emails found, discovery runs |

**Actions:**
- Open quick-edit modal from any producer card
- Auto-advance hook runs on load (advances overdue statuses)

---

## YouTube Producers

**Purpose:** Full searchable/filterable table of all YouTube producers.

**Data loaded:** All YouTube producers (up to 5000, sorted by created_date desc)

**Filters:**

| Filter | Options |
|--------|---------|
| Search | Name or Instagram handle (case-insensitive) |
| Status | All / por contactar / contactado / follow up 1–5 / archivado / eliminado |
| Style | All / Juice WRLD / Polo G / Rod Wave / NBA YoungBoy / Melodic Trap / Emo Trap / Other |

**Table columns:** name, instagram, youtube_channel, style, status, priority

**Actions:**

| Action | Description |
|--------|-------------|
| Row click | Opens ProducerProfile modal (full edit form) |
| Checkbox select | Multi-select rows for bulk operations |
| Instagram click icon | Sets `last_action = today`, `next_follow_up = +7d` |
| Favorite toggle | Stars/unstars the producer |
| Add Producer button | Opens AddProducerDialog to manually add a new YouTube producer |
| CSV Import | Upload a CSV file to bulk-import producers. Status values are normalized automatically (e.g. `Contactado/48h` → `contactado`). |
| CSV Export | Download current filtered list as CSV |
| Bulk: Status | Update status for all selected |
| Bulk: Priority | Update priority for all selected |
| Bulk: Style | Update style for all selected |
| Bulk: Delete | Delete all selected producers |

**Pagination:** 50 rows per page

---

## Placement Producers

**Purpose:** Full table of placement producers (sourced from song credits).

**Data loaded:** All placement producers (up to 5000, sorted by created_date desc)

**Filters:**

| Filter | Options |
|--------|---------|
| Search | Name or artist (case-insensitive) |
| Status | All / por contactar / contactado / follow up 1–5 / archivado / eliminado |

**Table columns:** name, style, placements, instagram, priority, status

**Actions:** Same as YouTube Producers tab — row click, select, bulk ops, CSV import/export, add producer, favorites.

**Pagination:** 50 rows per page

---

## Daily Outreach

**Purpose:** Daily action hub. Two sections: today's follow-ups and new DMs to send.

**Data loaded:**
- YouTube producers (top 200, sorted by priority desc)
- Placement producers (top 200, sorted by priority desc)

### Follow Ups Pendientes

**Filter:** Producers with status `contactado` or `follow up 1–5`, where `next_follow_up <= today`

**Sorted by:** `next_follow_up` ascending (most overdue first)

**Displays per row:** name, producer type badge (YouTube/Placement), status badge, re_dms flag, instagram, follow-up date (overdue/today/tomorrow/in Xd), priority bar

**Actions:**

| Action | Description |
|--------|-------------|
| Pencil icon | Opens QuickEditModal to edit status, notes, follow-up date |
| Hecho button | Advances status to next step and sets `next_follow_up = +7d`. If re_dms=no and at FU4+, archives the producer |

### Daily DMs

**Filter:** Producers with status `por contactar`, top 10 by priority

**Displays per row:** rank number, name, style, re_dms flag, instagram link, email link, IG followers, priority bar

**Actions:**

| Action | Description |
|--------|-------------|
| Pencil icon | Opens QuickEditModal |
| Enviado button | Marks as contacted. If re_dms=no → sets status `follow up 4`, `next_follow_up = +7d`. Otherwise → status `contactado`, `next_follow_up = +1d` |

---

## Connections

**Purpose:** Shows only producers with an active real relationship (`status = 'connection'`).

**Data loaded:**
- YouTube producers (up to 5000, sorted by last_action desc)
- Placement producers (up to 5000, sorted by last_action desc)

**Tabs:**

| Tab | Shows | Columns |
|-----|-------|---------|
| YouTube | YouTube producers with `status = 'connection'` | name, instagram, phone, style, last_action, next_follow_up, status |
| Placement | Placement producers with `status = 'connection'` | name, instagram, phone, style, placements, last_action, next_follow_up, status |

Each tab shows a count badge (e.g., "YouTube 4").

**Search:** Filters by name or Instagram within the active tab.

**Sorted by:** priority descending.

**Actions:**

| Action | Description |
|--------|-------------|
| Row click | Opens ProducerProfile modal (full edit + delete) |
| Instagram click icon | Sets `last_action = today`, `next_follow_up = +7d` |

---

## Discovery

**Purpose:** Automated producer discovery from YouTube type beat searches and song credits.

**Data loaded:** Discovery logs (last 50, sorted by created_date desc)

### YouTube Discovery (DiscoveryRunner component)

**How it works:**
1. User enters a search query (preset buttons or custom input) and selects a scan limit (50/100/200 videos)
2. Fetches from `/api/discovery/run` in paginated batches of 15 videos
3. For each video, extracts producer name from title using regex patterns
4. De-duplicates by name and Instagram handle against existing producers
5. Filters out producers with estimated IG followers > 15,000
6. Classifies music style based on query + title keywords
7. Calculates priority score
8. Saves new producers as `YouTubeProducer` records with `source = 'YouTube'`, `status = 'por contactar'`
9. Creates a `DiscoveryLog` entry tracking totals

**Preset queries:** juice wrld type beat, rod wave type beat, polo g type beat, nba youngboy type beat, nocap type beat

**Scan limits:**
- 50 videos → ~10 new producers
- 100 videos → ~20 new producers
- 200 videos → ~35 new producers

**Error handling:** If `YOUTUBE_API_KEY` is missing or YouTube quota is exceeded, shows an error toast and marks the log as `error`.

**Note:** AI contact extraction (Instagram/email enrichment) is currently stubbed — producers are saved with channel data only until OpenRouter integration is added.

### Placement Discovery (PlacementDiscovery component)

Separate discovery flow for extracting producers from song credits. Saves to `PlacementProducer` table.

### Discovery History

**Shows per row:** query, source icon (YouTube/Placement), timestamp, producers found/added/dupes/filtered, status badge

**Actions:**

| Action | Description |
|--------|-------------|
| Clear Logs button | Deletes all log entries (with confirmation prompt) |

---

## Message Generator

**Purpose:** Generate outreach DM templates for a selected producer.

**Data loaded:** YouTube producers with `status = 'por contactar'` (for the producer name dropdown)

**Inputs:**

| Input | Options |
|-------|---------|
| Producer | Dropdown of uncontacted YouTube producers |
| Style Reference | Free text (e.g., "Juice WRLD") |
| Tone | Casual / Professional / Direct / Complimentary |
| Offering | Loops / Starters / Beats / Collab |

**Output:** 3 message templates — click to copy each to clipboard.

**Note:** Message generation is currently hardcoded templates. AI generation via OpenRouter is planned but not yet implemented.

---

## Shared Components Reference

| Component | Used In | Purpose |
|-----------|---------|---------|
| `ProducerTable` | YouTube Producers, Placement Producers, Connections | Sortable table with column config and row selection |
| `ProducerProfile` | All producer tables | Full edit modal — all fields, save, delete |
| `AddProducerDialog` | YouTube Producers, Placement Producers | Quick-add form for manual producer entry |
| `QuickEditModal` | Daily Outreach, Dashboard | Lightweight modal for editing status/priority/notes |
| `BulkActionBar` | YouTube Producers, Placement Producers | Appears on multi-select, bulk update/delete |
| `CsvImportExport` | YouTube Producers, Placement Producers | CSV file import + current-view export |
| `StatusBadge` | All pages | Color-coded badge for outreach status |
| `PriorityBar` | All pages | Visual 1–10 priority indicator |
| `useAutoAdvanceStatus` | Dashboard, Daily Outreach | Hook: auto-advances overdue statuses on load |
| `normalizeStatus` | CSV import (CsvImportExport) | Utility: maps non-standard status strings to valid pipeline values before saving |
