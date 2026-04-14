# Codex Handoff — Producer Radar Client Fixes

## Objective
Fix the client-reported workflow bugs first, then implement flexible database views/filters without rewriting the current table system.

## Priority order
1. Fix shift-select in Daily Outreach follow-ups
2. Stop automatic overdue follow-up mutation on page load
3. Make follow-up editing match the normal producer editor
4. Add column visibility controls to both producer database pages
5. Add advanced property-based filtering like Notion

---

## Phase 1 — Fix follow-up shift-select

### Problem
Shift-select in follow-ups is broken. It should behave like the shared table selection flow, but keep the yellow follow-up styling.

### Files
- `src/pages/DailyContacts.jsx`
- `src/components/shared/ProducerTable.jsx` (only if extracting shared selection logic helps)

### Instructions
- Rework follow-up selection in `DailyContacts.jsx` to match the anchor/range selection behavior already used in `ProducerTable.jsx`.
- Keep composite row keys like ``${_type}-${id}`` because follow-up rows mix YouTube and Placement producers.
- Range selection must use the **exact rendered row order**, including across `overdue`, `today`, and `upcoming` groups.
- Preserve amber/yellow selected-row and checkbox styling.

### Reuse
- Reuse the shift-range pattern from `src/components/shared/ProducerTable.jsx`.

### Verify
- Single select works
- Shift-select works within the same group
- Shift-select works across groups
- Yellow selected styling remains correct

---

## Phase 2 — Stop automatic overdue mutations

### Problem
Overdue follow-ups are being auto-changed instead of staying visible until manually handled.

### Files
- `src/components/shared/useAutoAdvanceStatus.jsx`
- `src/pages/Dashboard.jsx`
- any other consumer of the auto-advance hook

### Instructions
- Remove or disable the logic that auto-advances overdue items on page load.
- Review whether the archived-reset behavior in the same hook should also be removed or gated.
- Keep manual actions in `DailyContacts.jsx` working as-is:
  - `Hecho`
  - `Random Date`
  - `Enviado`

### Verify
- Load a producer with overdue `next_follow_up`
- Reload Dashboard and Daily Outreach
- Confirm status/date does not change automatically
- Confirm producer still appears in overdue

---

## Phase 3 — Unify follow-up editing with full producer editing

### Problem
The edit modal used from follow-ups does not match the normal producer editor.

### Files
- `src/pages/DailyContacts.jsx`
- `src/pages/Dashboard.jsx`
- `src/components/shared/QuickEditModal.jsx`
- `src/components/shared/ProducerProfile.jsx`

### Instructions
- Use `ProducerProfile.jsx` as the canonical editor where possible.
- Replace `QuickEditModal` in follow-up/dashboard flows, or refactor it so it shares the same field set and save rules.
- Standardize date handling across editors.
- Standardize type mapping between:
  - `_type: 'yt' | 'pl'`
  - `type='youtube' | 'placement'`

### Reuse
- Reuse `src/components/shared/ProducerProfile.jsx` instead of maintaining two different editing experiences.

### Verify
- Open edit from YouTube page
- Open edit from Placement page
- Open edit from Daily Outreach
- Confirm same core fields and save behavior

---

## Phase 4 — Add column visibility to both producer database pages

### Problem
The client wants to temporarily show/hide table properties depending on the current workflow.

### Files
- `src/pages/PlacementProducers.jsx`
- `src/pages/YouTubeProducers.jsx`
- possibly a shared hook/component if needed

### Instructions
- Extract Placement page’s column visibility pattern into shared reusable logic.
- Add equivalent controls to `YouTubeProducers.jsx`.
- Keep separate persistence keys per page/type.
- Continue using `ProducerTable.jsx` for rendering dynamic columns.

### Reuse
- Reuse existing visibility logic in `src/pages/PlacementProducers.jsx`.
- Reuse dynamic column rendering in `src/components/shared/ProducerTable.jsx`.

### Verify
- Toggle columns on both pages
- Reload pages
- Confirm visibility settings persist correctly

---

## Phase 5 — Add advanced property-based filtering

### Problem
The client wants Notion-like filtering by arbitrary properties.

### Example requests
- `artist contains NBA YoungBoy`
- `donde_enviar contains iMessage`
- `highlights_placements contains NBA YoungBoy`

### Files
- `src/pages/YouTubeProducers.jsx`
- `src/pages/PlacementProducers.jsx`
- shared metadata/filter utilities if needed

### Instructions
Build a reusable filter system with:
- property selector
- operator selector
- value input

Start with AND-only rules.

### Recommended first operators
- `contains`
- `does not contain`
- `is`
- `is not`
- `is empty`
- `is not empty`

### Recommended first fields
- `artist`
- `highlights_placements`
- `donde_enviar`
- `que_enviar`
- `status`
- `style`
- `re_dms`
- contact fields

### Reuse
- Reuse existing field knowledge from:
  - `src/components/shared/ProducerTable.jsx`
  - `src/components/shared/CsvImportExport.jsx`
  - `src/pages/PlacementProducers.jsx`

### Verify
- Filter results are correct
- Counts are correct
- Pagination resets correctly after filter changes

---

## Important risks
- Shift-select must use rendered row order, not source-array order
- Date format inconsistency (`YYYY-MM-DD` vs ISO timestamp) can cause overdue bugs
- `ProducerProfile.jsx` has status-related automation that may need review after removing page-load automation
- Some fields only exist on one producer type; filters/columns must respect that
- Persisted view/filter settings must be backward-safe

---

## Do not rewrite unnecessarily
Reuse these existing systems:
- `src/components/shared/ProducerTable.jsx`
- `src/components/shared/ProducerProfile.jsx`
- `src/pages/PlacementProducers.jsx` column visibility logic

Prefer extending current shared pieces over building parallel components.

---

## Final verification
Run:

```bash
npm run lint
npm run typecheck
```

If helper tests are added:

```bash
npx jest
```

Smoke test these routes:
- `/Dashboard`
- `/DailyContacts`
- `/YouTubeProducers`
- `/PlacementProducers`
