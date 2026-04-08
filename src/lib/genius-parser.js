const HTML_ENTITY_MAP = {
  '&amp;': '&',
  '&quot;': '"',
  '&#34;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

export function decodeHtmlEntities(text) {
  if (!text) return '';
  return text.replace(/&[a-zA-Z0-9#]+;/g, (m) => HTML_ENTITY_MAP[m] || m);
}

function stripTitleSuffix(title) {
  const cleaned = title
    .replace(/\s*Lyrics\s*\|\s*Genius\s*Lyrics\s*$/i, '')
    .replace(/\s*\|\s*Genius\s*Lyrics\s*$/i, '')
    .replace(/\s*Lyrics\s*$/i, '')
    .trim();
  return cleaned;
}

export function extractTitle(html) {
  if (!html) return '';
  const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (ogMatch?.[1]) return stripTitleSuffix(decodeHtmlEntities(ogMatch[1]));
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) return stripTitleSuffix(decodeHtmlEntities(titleMatch[1]));
  return '';
}

function parseJsonLd(html) {
  const scriptMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!scriptMatch?.[1]) return null;
  try {
    return JSON.parse(scriptMatch[1].trim());
  } catch {
    return null;
  }
}

function getArtistFromJsonLd(json) {
  if (!json) return '';
  const candidates = Array.isArray(json) ? json : [json];
  for (const item of candidates) {
    const artist = item?.byArtist?.name;
    if (artist) return artist;
  }
  return '';
}

export function extractArtist(html) {
  if (!html) return '';
  const json = parseJsonLd(html);
  const fromJson = getArtistFromJsonLd(json);
  if (fromJson) return decodeHtmlEntities(fromJson);

  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (ogDescMatch?.[1]) {
    const desc = decodeHtmlEntities(ogDescMatch[1]);
    const byMatch = desc.match(/by\s+([^<]+?)(?:\s+on\b|\s+from\b|\s*$)/i);
    if (byMatch?.[1]) return byMatch[1].trim();
  }

  return '';
}

export function extractInstagramFromUrl(url) {
  if (!url) return '';
  const match = String(url).match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (!match?.[1]) return '';
  return `https://instagram.com/${match[1]}`;
}

function uniqueByName(producers) {
  const seen = new Set();
  return producers.filter((p) => {
    const key = (p.name || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractProducersFromHtml(html) {
  if (!html) return [];
  const hasProdBlock = /Produced by|Co-Produced by/i.test(html);
  if (!hasProdBlock) return [];

  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const anchors = Array.from(html.matchAll(anchorRegex)).map((m) => ({
    href: m[1],
    text: decodeHtmlEntities(m[2].replace(/<[^>]+>/g, '').trim()),
  }));

  const producers = [];
  for (const a of anchors) {
    if (/genius\.com\/artists\//i.test(a.href)) {
      if (a.text) producers.push({ name: a.text, instagram: '' });
    } else if (/instagram\.com\//i.test(a.href)) {
      const last = producers.at(-1);
      if (last) last.instagram = extractInstagramFromUrl(a.href) || a.href;
    }
  }

  return uniqueByName(producers);
}

export function extractFromState(state) {
  if (!state?.entities?.songs) return null;
  const songs = Object.values(state.entities.songs || {});
  if (!songs.length) return null;
  const song = songs[0];

  const song_title = song?.title || '';
  const artist = song?.primary_artist?.name || '';

  const custom = song?.custom_performances || [];
  const perfProducers = custom
    .filter((p) => /Produced by/i.test(p?.label || ''))
    .flatMap((p) => p?.artists || []);

  const producerArtists = song?.producer_artists || [];

  const producers = [...perfProducers, ...producerArtists]
    .map((p) => ({ name: p?.name || '' }))
    .filter((p) => p.name);

  return {
    song_title,
    artist,
    producers: uniqueByName(producers),
  };
}

export function extractFromHtml(html) {
  return {
    song_title: extractTitle(html),
    artist: extractArtist(html),
    producers: extractProducersFromHtml(html),
  };
}
