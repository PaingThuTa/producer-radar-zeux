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
    expect(res._json.producers).toHaveLength(0);
  });

  test('returns discovered producers without saving', async () => {
    process.env.GENIUS_TOKEN = 'test-token';

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({
        response: { hits: [{ type: 'song', result: { id: 42, title: "God's Plan", primary_artist: { name: 'Drake' } } }] },
      })})
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({
        response: { song: { id: 42, title: "God's Plan", primary_artist: { name: 'Drake' }, producer_artists: [{ id: 101, name: 'Boi-1da' }] } },
      })})
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({
        response: { artist: { id: 101, name: 'Boi-1da', instagram_name: 'boi1da' } },
      })});

    prisma.placementProducer.findMany.mockResolvedValue([]);

    const req = makeReq({ urls: ['https://genius.com/Drake-gods-plan-lyrics'] });
    const res = makeRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.producers).toHaveLength(1);
    expect(res._json.producers[0]).toMatchObject({
      name: 'Boi-1da',
      instagram: 'https://instagram.com/boi1da',
      isDuplicate: false,
    });
    // API must NOT save — saving is deferred to the UI
    expect(prisma.placementProducer.create).not.toHaveBeenCalled();
  });

  test('flags existing producers as isDuplicate', async () => {
    process.env.GENIUS_TOKEN = 'test-token';

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({
        response: { hits: [{ type: 'song', result: { id: 42, title: "God's Plan", primary_artist: { name: 'Drake' } } }] },
      })})
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({
        response: { song: { id: 42, title: "God's Plan", primary_artist: { name: 'Drake' }, producer_artists: [{ id: 101, name: 'Boi-1da' }] } },
      })})
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({
        response: { artist: { id: 101, name: 'Boi-1da', instagram_name: null } },
      })});

    prisma.placementProducer.findMany.mockResolvedValue([{ name: 'Boi-1da' }]);

    const req = makeReq({ urls: ['https://genius.com/Drake-gods-plan-lyrics'] });
    const res = makeRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.producers[0].isDuplicate).toBe(true);
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
    expect(res._json.producers).toHaveLength(0);
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
    expect(res._json.songResults[0].url).toBe('https://genius.com/Some-song-lyrics');
  });
});
