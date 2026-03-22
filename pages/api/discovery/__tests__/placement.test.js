import handler from '../placement';

// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    placementProducer: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';

// Helper to build a mock req/res pair
function makeReq(body = {}, method = 'POST') {
  return { method, body };
}

function makeRes() {
  const res = {
    _status: 200,
    _json: null,
    status(code) { this._status = code; return this; },
    json(data) { this._json = data; return this; },
    end() { return this; },
  };
  return res;
}

// Mock global fetch
global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.GENIUS_TOKEN;
});

describe('POST /api/discovery/placement', () => {
  test('returns 405 for non-POST requests', async () => {
    const req = makeReq({}, 'GET');
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  test('returns 500 when GENIUS_TOKEN is missing', async () => {
    const req = makeReq({ urls: ['https://genius.com/Drake-gods-plan-lyrics'] });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(500);
    expect(res._json.error).toMatch(/GENIUS_TOKEN/);
  });

  test('returns 400 when urls is missing or empty', async () => {
    process.env.GENIUS_TOKEN = 'test-token';
    const req = makeReq({});
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(400);

    const req2 = makeReq({ urls: [] });
    const res2 = makeRes();
    await handler(req2, res2);
    expect(res2._status).toBe(400);
  });

  test('skips non-genius URLs and continues', async () => {
    process.env.GENIUS_TOKEN = 'test-token';
    prisma.placementProducer.findMany.mockResolvedValue([]);
    const req = makeReq({ urls: ['https://spotify.com/track/123'] });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._json.found).toBe(0);
    expect(res._json.added).toBe(0);
  });

  test('extracts producers and saves new ones', async () => {
    process.env.GENIUS_TOKEN = 'test-token';

    // Mock search response
    const searchResponse = {
      response: {
        hits: [{
          type: 'song',
          result: { id: 42, title: "God's Plan", primary_artist: { name: 'Drake' } },
        }],
      },
    };

    // Mock song detail response
    const songResponse = {
      response: {
        song: {
          id: 42,
          title: "God's Plan",
          primary_artist: { name: 'Drake' },
          producer_artists: [{ id: 101, name: 'Boi-1da' }],
        },
      },
    };

    // Mock artist detail response
    const artistResponse = {
      response: {
        artist: { id: 101, name: 'Boi-1da', instagram_name: 'boi1da' },
      },
    };

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(searchResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(songResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(artistResponse) });

    prisma.placementProducer.findMany.mockResolvedValue([]);
    prisma.placementProducer.create.mockResolvedValue({ id: '1', name: 'Boi-1da' });

    const req = makeReq({ urls: ['https://genius.com/Drake-gods-plan-lyrics'] });
    const res = makeRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.found).toBe(1);
    expect(res._json.added).toBe(1);
    expect(res._json.duplicates).toBe(0);
    expect(prisma.placementProducer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Boi-1da',
        instagram: 'https://instagram.com/boi1da',
        source: 'Genius API',
        status: 'por contactar',
      }),
    });
  });

  test('counts existing producers as duplicates, does not re-insert', async () => {
    process.env.GENIUS_TOKEN = 'test-token';

    const searchResponse = {
      response: {
        hits: [{ type: 'song', result: { id: 42, title: "God's Plan", primary_artist: { name: 'Drake' } } }],
      },
    };
    const songResponse = {
      response: {
        song: {
          id: 42,
          title: "God's Plan",
          primary_artist: { name: 'Drake' },
          producer_artists: [{ id: 101, name: 'Boi-1da' }],
        },
      },
    };
    const artistResponse = {
      response: { artist: { id: 101, name: 'Boi-1da', instagram_name: null } },
    };

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(searchResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(songResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(artistResponse) });

    // Producer already exists in DB
    prisma.placementProducer.findMany.mockResolvedValue([{ name: 'Boi-1da' }]);

    const req = makeReq({ urls: ['https://genius.com/Drake-gods-plan-lyrics'] });
    const res = makeRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.found).toBe(1);
    expect(res._json.added).toBe(0);
    expect(res._json.duplicates).toBe(1);
    expect(prisma.placementProducer.create).not.toHaveBeenCalled();
  });

  test('skips URL when Genius search returns no hits', async () => {
    process.env.GENIUS_TOKEN = 'test-token';

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: { hits: [] } }),
    });

    prisma.placementProducer.findMany.mockResolvedValue([]);

    const req = makeReq({ urls: ['https://genius.com/Unknown-song-lyrics'] });
    const res = makeRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.found).toBe(0);
    expect(res._json.added).toBe(0);
    expect(res._json.songResults[0].skipped).toBe(true);
  });

  test('includes per-song results in response', async () => {
    process.env.GENIUS_TOKEN = 'test-token';

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: { hits: [] } }),
    });

    prisma.placementProducer.findMany.mockResolvedValue([]);

    const req = makeReq({ urls: ['https://genius.com/Some-song-lyrics'] });
    const res = makeRes();
    await handler(req, res);

    expect(Array.isArray(res._json.songResults)).toBe(true);
    expect(res._json.songResults).toHaveLength(1);
    expect(res._json.songResults[0].url).toBe('https://genius.com/Some-song-lyrics');
  });
});
