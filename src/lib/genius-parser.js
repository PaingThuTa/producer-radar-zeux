/**
 * Pure parsing utilities for Genius page data.
 * Separated from the API route so they can be unit tested independently.
 */

export function extractFromState(state) {
  try {
    const entities = state?.entities || state?.songPage?.song || null;
    if (!entities) return null;

    let song = null;
    if (entities.songs) {
      const songIds = Object.keys(entities.songs);
      if (songIds.length > 0) song = entities.songs[songIds[0]];
    } else if (entities.title) {
      song = entities;
    }

    if (!song) return null;

    const song_title = song.title || '';
    const artist = song.primary_artist?.name || song.artist_names || '';
    const producers = [];

    const performances = song.custom_performances || [];
    if (Array.isArray(performances)) {
      for (const perf of performances) {
        const label = (perf.label || '').toLowerCase();
        if (label.includes('produc') || label.includes('co-produc') || label.includes('beat')) {
          for (const a of perf.artists || []) {
            const name = (a.name || '').trim();
            if (!name) continue;
            const instagram = extractInstagramFromUrl(a.url || '');
            producers.push({ name, instagram });
          }
        }
      }
    }

    if (Array.isArray(song.producer_artists)) {
      for (const a of song.producer_artists) {
        const name = (a.name || '').trim();
        if (!name) continue;
        if (!producers.find(p => p.name.toLowerCase() === name.toLowerCase())) {
          producers.push({ name, instagram: '' });
        }
      }
    }

    return { song_title, artist, producers };
  } catch {
    return null;
  }
}

export function extractFromHtml(html) {
  const song_title = extractTitle(html);
  const artist = extractArtist(html);
  const producers = extractProducersFromHtml(html);
  return { song_title, artist, producers };
}

export function extractTitle(html) {
  const og = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
  if (og) {
    return og[1].replace(/\s*\|\s*Genius.*/i, '').replace(/\s+Lyrics$/i, '').trim();
  }
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title) {
    return title[1].replace(/\s*\|\s*Genius.*/i, '').replace(/\s+Lyrics$/i, '').trim();
  }
  return '';
}

export function extractArtist(html) {
  const jsonLd = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLd) {
    try {
      const data = JSON.parse(jsonLd[1]);
      if (data.byArtist?.name) return data.byArtist.name;
      if (Array.isArray(data.byArtist) && data.byArtist[0]?.name) return data.byArtist[0].name;
    } catch {}
  }

  const desc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i);
  if (desc) {
    const m = desc[1].match(/by\s+([A-Z][A-Za-z0-9.']*(?:\s+[A-Z][A-Za-z0-9.']*)*)/);

    if (m) return m[1].trim();
  }

  return '';
}

export function extractProducersFromHtml(html) {
  const producers = [];

  const creditSections = html.matchAll(/Produced\s+by|Co-Produced\s+by|Production/gi);
  for (const match of creditSections) {
    const start = match.index;
    const chunk = html.slice(start, start + 800);

    const links = chunk.matchAll(/<a[^>]+href="https?:\/\/genius\.com\/artists\/([^"]+)"[^>]*>([^<]+)<\/a>/gi);
    for (const link of links) {
      const name = decodeHtmlEntities(link[2].trim());
      if (!name || name.length < 2) continue;
      if (producers.find(p => p.name.toLowerCase() === name.toLowerCase())) continue;

      const igMatch = chunk.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
      const instagram = igMatch ? `https://instagram.com/${igMatch[1]}` : '';
      producers.push({ name, instagram });
    }
  }

  return producers;
}

export function extractInstagramFromUrl(url) {
  if (!url) return '';
  const m = url.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
  return m ? `https://instagram.com/${m[1]}` : '';
}

export function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}
