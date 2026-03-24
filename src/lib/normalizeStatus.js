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
 * - `contactado/*` variants (e.g. "Contactado/48h") → "contactado"
 * - `follow up N` (any case) → lowercase canonical form
 * - Already-valid status → returned as-is (lowercased)
 * - Unrecognized → "por contactar"
 */
export function normalizeStatus(raw) {
  if (!raw) return 'por contactar';
  const s = String(raw).trim().toLowerCase();

  // contactado/XXh or any contactado/* variant
  if (/^contactado\//.test(s)) return 'contactado';

  if (VALID_STATUSES.has(s)) return s;

  return 'por contactar';
}
