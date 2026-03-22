/**
 * Tests for src/lib/genius-parser.js
 *
 * Run: npx jest __tests__/genius-parser.test.js
 * (requires: npm install --save-dev jest @jest/globals babel-jest @babel/preset-env)
 */

import {
  extractTitle,
  extractArtist,
  extractProducersFromHtml,
  extractFromState,
  extractFromHtml,
  decodeHtmlEntities,
  extractInstagramFromUrl,
} from '../src/lib/genius-parser.js';

// ── extractTitle ──────────────────────────────────────────────────────────────

describe('extractTitle', () => {
  test('extracts from og:title and strips Genius suffix', () => {
    const html = `<meta property="og:title" content="Lucid Dreams Lyrics | Genius Lyrics" />`;
    expect(extractTitle(html)).toBe('Lucid Dreams');
  });

  test('strips Lyrics suffix from title tag', () => {
    const html = `<title>Lucid Dreams Lyrics</title>`;
    expect(extractTitle(html)).toBe('Lucid Dreams');
  });

  test('returns empty string when no title found', () => {
    expect(extractTitle('<html></html>')).toBe('');
  });
});

// ── extractArtist ─────────────────────────────────────────────────────────────

describe('extractArtist', () => {
  test('extracts from JSON-LD byArtist.name', () => {
    const html = `
      <script type="application/ld+json">
        {"@type":"MusicRecording","name":"Lucid Dreams","byArtist":{"name":"Juice WRLD"}}
      </script>`;
    expect(extractArtist(html)).toBe('Juice WRLD');
  });

  test('extracts from og:description "by Artist" pattern', () => {
    const html = `<meta property="og:description" content="Lyrics by Polo G on this track" />`;
    expect(extractArtist(html)).toBe('Polo G');
  });

  test('returns empty string when nothing found', () => {
    expect(extractArtist('<html></html>')).toBe('');
  });
});

// ── extractProducersFromHtml ──────────────────────────────────────────────────

describe('extractProducersFromHtml', () => {
  test('finds producer from "Produced by" credit block', () => {
    const html = `
      <div>Produced by</div>
      <a href="https://genius.com/artists/Oogie-Mane">Oogie Mane</a>
    `;
    const producers = extractProducersFromHtml(html);
    expect(producers).toHaveLength(1);
    expect(producers[0].name).toBe('Oogie Mane');
  });

  test('deduplicates producers', () => {
    const html = `
      <div>Produced by</div>
      <a href="https://genius.com/artists/Oogie-Mane">Oogie Mane</a>
      <div>Co-Produced by</div>
      <a href="https://genius.com/artists/Oogie-Mane">Oogie Mane</a>
    `;
    const producers = extractProducersFromHtml(html);
    expect(producers).toHaveLength(1);
  });

  test('captures instagram link when present in credit block', () => {
    const html = `
      <div>Produced by</div>
      <a href="https://genius.com/artists/Hardo-B">Hardo B</a>
      <a href="https://instagram.com/hardobeats">@hardobeats</a>
    `;
    const producers = extractProducersFromHtml(html);
    expect(producers[0].instagram).toBe('https://instagram.com/hardobeats');
  });

  test('returns empty array when no producers found', () => {
    const html = `<div>Written by Someone</div>`;
    expect(extractProducersFromHtml(html)).toHaveLength(0);
  });
});

// ── extractFromState ──────────────────────────────────────────────────────────

describe('extractFromState', () => {
  test('returns null for empty state', () => {
    expect(extractFromState({})).toBeNull();
    expect(extractFromState(null)).toBeNull();
  });

  test('extracts song data from entities.songs', () => {
    const state = {
      entities: {
        songs: {
          '123': {
            title: 'Lucid Dreams',
            primary_artist: { name: 'Juice WRLD' },
            custom_performances: [
              {
                label: 'Produced by',
                artists: [{ name: 'Nick Mira', url: '' }, { name: 'Oogie Mane', url: '' }],
              },
            ],
          },
        },
      },
    };

    const result = extractFromState(state);
    expect(result.song_title).toBe('Lucid Dreams');
    expect(result.artist).toBe('Juice WRLD');
    expect(result.producers).toHaveLength(2);
    expect(result.producers[0].name).toBe('Nick Mira');
  });

  test('includes producer_artists array when present', () => {
    const state = {
      entities: {
        songs: {
          '1': {
            title: 'Test',
            primary_artist: { name: 'Artist' },
            custom_performances: [],
            producer_artists: [{ name: 'Producer A' }],
          },
        },
      },
    };

    const result = extractFromState(state);
    expect(result.producers).toHaveLength(1);
    expect(result.producers[0].name).toBe('Producer A');
  });

  test('skips producers with empty names', () => {
    const state = {
      entities: {
        songs: {
          '1': {
            title: 'Test',
            custom_performances: [
              { label: 'Produced by', artists: [{ name: '' }, { name: 'Valid Name' }] },
            ],
          },
        },
      },
    };

    const result = extractFromState(state);
    expect(result.producers).toHaveLength(1);
    expect(result.producers[0].name).toBe('Valid Name');
  });
});

// ── extractFromHtml (integration) ────────────────────────────────────────────

describe('extractFromHtml', () => {
  test('returns all three fields', () => {
    const html = `
      <title>Test Song Lyrics</title>
      <meta property="og:description" content="Great track by Test Artist" />
      <div>Produced by</div>
      <a href="https://genius.com/artists/The-Producer">The Producer</a>
    `;
    const result = extractFromHtml(html);
    expect(result.song_title).toBe('Test Song');
    expect(result.artist).toBe('Test Artist');
    expect(result.producers).toHaveLength(1);
  });
});

// ── helpers ───────────────────────────────────────────────────────────────────

describe('decodeHtmlEntities', () => {
  test('decodes common entities', () => {
    expect(decodeHtmlEntities('A &amp; B')).toBe('A & B');
    expect(decodeHtmlEntities('&quot;quoted&quot;')).toBe('"quoted"');
  });
});

describe('extractInstagramFromUrl', () => {
  test('extracts handle from instagram URL', () => {
    expect(extractInstagramFromUrl('https://instagram.com/beatmaker_')).toBe('https://instagram.com/beatmaker_');
  });

  test('returns empty string for non-instagram URL', () => {
    expect(extractInstagramFromUrl('https://twitter.com/beatmaker')).toBe('');
  });

  test('returns empty string for empty input', () => {
    expect(extractInstagramFromUrl('')).toBe('');
    expect(extractInstagramFromUrl(null)).toBe('');
  });
});
