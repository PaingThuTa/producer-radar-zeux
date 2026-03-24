const VALID_STATUSES = new Set([
  'por contactar',
  'contactado',
  'follow up 1',
  'follow up 2',
  'follow up 3',
  'follow up 4',
  'follow up 5',
  'archivado',
  'eliminado',
  'connection',
]);

/**
 * Normalizes a raw status string to one of the app's valid statuses.
 *
 * - `contactado/48`, `follow up 1/2025-03-25`, or any `status/suffix` variant → strips suffix
 * - Already-valid status → returned as-is (lowercased)
 * - Unrecognized → "por contactar"
 */
export function normalizeStatus(raw) {
  if (!raw) return 'por contactar';
  const s = String(raw).trim().toLowerCase();

  // Strip slash-appended suffix from any status
  // e.g. "contactado/48" → "contactado", "follow up 1/2025-03-25" → "follow up 1"
  const base = s.includes('/') ? s.slice(0, s.indexOf('/')).trim() : s;

  if (VALID_STATUSES.has(base)) return base;

  return 'por contactar';
}
