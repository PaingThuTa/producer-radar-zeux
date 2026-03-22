/**
 * POST /api/discovery/placement
 * Body: { urls: string[] }
 *
 * For each Genius song URL, calls the official Genius API to extract producer_artists,
 * fetches their social links, deduplicates against the DB, and saves new producers.
 *
 * Returns: { found, added, duplicates, songResults }
 */

import { prisma } from '@/lib/db';

const GENIUS_BASE = 'https://api.genius.com';

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
          });
        } else {
          // Merge song info for producers found across multiple URLs
          const existing = discoveredProducers.get(key);
          if (songTitle && !existing.song.includes(songTitle)) {
            existing.song = existing.song ? `${existing.song}, ${songTitle}` : songTitle;
          }
          if (!existing.instagram && instagram) {
            existing.instagram = instagram;
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

  // Save new (non-duplicate) producers
  let added = 0;
  let duplicates = 0;

  for (const [key, producer] of discoveredProducers) {
    if (existingNames.has(key)) {
      duplicates++;
      continue;
    }

    await prisma.placementProducer.create({
      data: {
        name: producer.name,
        instagram: producer.instagram || null,
        song: producer.song || null,
        artist: producer.artist || null,
        source: 'Genius API',
        status: 'por contactar',
      },
    });

    existingNames.add(key);
    added++;
  }

  return res.status(200).json({
    found: discoveredProducers.size,
    added,
    duplicates,
    songResults,
  });
}
