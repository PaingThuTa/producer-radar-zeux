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
 * - `follow up N` with any whitespace variation → canonical form
 * - `no response` → archivado
 * - `archivado*` variants → archivado
 * - `eliminado*` variants → eliminado
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

  // follow up with any whitespace variation: "follow  up 1", "FOLLOW UP 3", etc.
  const followMatch = base.match(/^follow\s+up\s+([1-5])$/);
  if (followMatch) return `follow up ${followMatch[1]}`;

  // "no response" → archivado
  if (base === 'no response') return 'archivado';

  // "archivado (para el futuro)" or any archivado/* variant
  if (base.startsWith('archivado')) return 'archivado';

  // "eliminado" with extra suffix
  if (base.startsWith('eliminado')) return 'eliminado';

  return 'por contactar';
}
