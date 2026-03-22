/**
 * POST /api/discovery/genius-scrape
 * Body: { url: string }
 *
 * Fetches a Genius song page and extracts song_title, artist, and producers.
 */

import { extractFromState, extractFromHtml } from '@/lib/genius-parser';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  if (!url.includes('genius.com')) {
    return res.status(400).json({ error: 'URL must be a genius.com link' });
  }

  let html;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(200).json({ found: false, reason: `HTTP ${response.status}` });
    }

    html = await response.text();
  } catch (err) {
    return res.status(200).json({ found: false, reason: err.message });
  }

  // ── Strategy 1: parse __PRELOADED_STATE__ JSON ─────────────────────────────
  const stateMatch =
    html.match(/window\.__PRELOADED_STATE__\s*=\s*JSON\.parse\('(.+?)'\)(?:\s*;)/s) ||
    html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{.+?\})(?:\s*;<\/script>)/s);

  if (stateMatch) {
    try {
      let raw = stateMatch[1];
      if (raw.includes("\\'")) {
        raw = raw.replace(/\\'/g, "'").replace(/\\"/g, '"');
      }
      const state = JSON.parse(raw);
      const result = extractFromState(state);
      if (result) {
        return res.status(200).json({ found: true, ...result });
      }
    } catch {
      // fall through to HTML parsing
    }
  }

  // ── Strategy 2: regex on raw HTML ─────────────────────────────────────────
  const result = extractFromHtml(html);
  if (result && result.producers.length > 0) {
    return res.status(200).json({ found: true, ...result });
  }

  return res.status(200).json({ found: false, reason: 'No producers found in page' });
}
