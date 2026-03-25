/**
 * POST /api/discovery/placement
 * Body: { urls: string[] }
 *
 * For each Genius song URL, calls the official Genius API to extract producer_artists
 * and fetches their social links. Returns all discovered producers with an isDuplicate
 * flag for those already in the DB. Does NOT save — saving is done by the UI after
 * the user reviews and confirms the selection.
 *
 * Returns: { producers, songResults }
 */

import { prisma } from '@/lib/db';

const GENIUS_BASE = 'https://api.genius.com';

const STYLE_ARTISTS = {
  'Juice WRLD': 'Juice WRLD',
  'Polo G': 'Polo G',
  'Rod Wave': 'Rod Wave',
  'NBA YoungBoy': 'NBA YoungBoy',
};
const BIG_NAMES = new Set(Object.keys(STYLE_ARTISTS));

function geniusFetch(path, token) {
  return fetch(`${GENIUS_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());
}

/**
 * Convert a Genius URL path slug to a search query string.
 * e.g. "Drake-gods-plan-lyrics" → "Drake gods plan"
 */
function slugToQuery(url) {
  try {
    const pathname = new URL(url).pathname; // e.g. /Drake-gods-plan-lyrics
    return pathname
      .replace(/^\//, '')
      .replace(/-lyrics$/i, '')
      .replace(/-/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const token = process.env.GENIUS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GENIUS_TOKEN env var is not set' });
  }

  const { urls } = req.body || {};
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'urls must be a non-empty array' });
  }

  // Load existing producer names for deduplication
  const existing = await prisma.placementProducer.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map(p => p.name.toLowerCase()));

  const songResults = [];
  // Track producers discovered across all songs (by name, case-insensitive)
  const discoveredProducers = new Map(); // name.lower → { name, instagram, song, artist }

  for (const url of urls) {
    // Skip non-Genius URLs
    if (typeof url !== 'string' || !url.includes('genius.com')) {
      songResults.push({ url, skipped: true, reason: 'not a genius.com URL' });
      continue;
    }

    const query = slugToQuery(url);
    if (!query) {
      songResults.push({ url, skipped: true, reason: 'could not parse URL' });
      continue;
    }

    try {
      // Step 1: Search for the song
      const searchData = await geniusFetch(
        `/search?q=${encodeURIComponent(query)}`,
        token,
      );
      const hits = searchData?.response?.hits ?? [];
      const songHit = hits.find(h => h.type === 'song');

      if (!songHit) {
        songResults.push({ url, skipped: true, reason: 'not found on Genius' });
        continue;
      }

      const songId = songHit.result.id;

      // Step 2: Get full song details (includes producer_artists)
      const songData = await geniusFetch(`/songs/${songId}`, token);
      const song = songData?.response?.song;

      if (!song) {
        songResults.push({ url, skipped: true, reason: 'song detail fetch failed' });
        continue;
      }

      const songTitle = song.title || '';
      const artistName = song.primary_artist?.name || '';
      const producerArtists = song.producer_artists || [];

      const songProducers = [];

      // Step 3: For each producer, fetch their artist profile for social links
      for (const producer of producerArtists) {
        if (!producer?.id || !producer?.name) continue;

        let instagramName = '';
        try {
          const artistData = await geniusFetch(`/artists/${producer.id}`, token);
          instagramName = artistData?.response?.artist?.instagram_name || '';
        } catch {
          // Social link fetch failed — continue with name only
        }

        const instagram = instagramName
          ? `https://instagram.com/${instagramName}`
          : '';

        songProducers.push({ name: producer.name, instagram });

        const key = producer.name.toLowerCase();
        if (!discoveredProducers.has(key)) {
          discoveredProducers.set(key, {
            name: producer.name,
            instagram,
            song: songTitle,
            artist: artistName,
            artists: artistName ? [artistName] : [],
            isDuplicate: existingNames.has(key),
          });
        } else {
          // Merge song info for producers found across multiple URLs
          const found = discoveredProducers.get(key);
          if (songTitle && !found.song.includes(songTitle)) {
            found.song = found.song ? `${found.song}, ${songTitle}` : songTitle;
          }
          if (artistName && !found.artists.includes(artistName)) {
            found.artists.push(artistName);
          }
          if (!found.instagram && instagram) {
            found.instagram = instagram;
          }
        }
      }

      songResults.push({
        url,
        song: songTitle,
        artist: artistName,
        producers: songProducers,
      });
    } catch (err) {
      songResults.push({ url, skipped: true, reason: err.message });
    }
  }

  return res.status(200).json({
    producers: [...discoveredProducers.values()].map(p => {
      const bigNames = p.artists.filter(a => BIG_NAMES.has(a));
      const otherNames = p.artists.filter(a => !BIG_NAMES.has(a));
      const placements = [...bigNames, ...otherNames].join(', ');
      const style = bigNames.length > 0 ? STYLE_ARTISTS[bigNames[0]] : '';
      const { artists, ...rest } = p;
      return { ...rest, placements, style };
    }),
    songResults,
  });
}
