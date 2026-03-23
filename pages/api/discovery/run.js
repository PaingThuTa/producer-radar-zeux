const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { query, maxResults = 15, pageToken } = req.body;
  if (!query) return res.status(400).json({ error: 'query required' });

  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: 'YOUTUBE_API_KEY not configured' });
  }

  // 1. Search YouTube for videos
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('key', YOUTUBE_API_KEY);
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('maxResults', String(Math.min(maxResults, 50)));
  if (pageToken) searchUrl.searchParams.set('pageToken', pageToken);

  const searchRes = await fetch(searchUrl.toString());
  const searchData = await searchRes.json();

  if (!searchRes.ok || searchData.error) {
    const msg = searchData?.error?.message || `HTTP ${searchRes.status}`;
    return res.status(502).json({ error: `YouTube API error: ${msg}` });
  }

  if (!searchData.items || searchData.items.length === 0) {
    return res.status(200).json({ producers: [], nextPageToken: null });
  }

  // 2. Fetch channel stats for subscriber counts
  const channelIds = [...new Set(searchData.items.map(item => item.snippet.channelId))];
  const channelUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
  channelUrl.searchParams.set('key', YOUTUBE_API_KEY);
  channelUrl.searchParams.set('part', 'statistics,snippet,brandingSettings');
  channelUrl.searchParams.set('id', channelIds.join(','));

  // Batch fetch video descriptions for IG extraction fallback
  const videoIds = searchData.items.map(item => item.id.videoId).filter(Boolean);
  const videoApiUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  videoApiUrl.searchParams.set('key', YOUTUBE_API_KEY);
  videoApiUrl.searchParams.set('part', 'snippet');
  videoApiUrl.searchParams.set('id', videoIds.join(','));

  const [channelRes, videoRes] = await Promise.all([
    fetch(channelUrl.toString()),
    fetch(videoApiUrl.toString()),
  ]);
  const channelData = await channelRes.json();
  const videoData = await videoRes.json();

  const videoDescMap = {};
  for (const v of videoData.items || []) {
    videoDescMap[v.id] = v.snippet?.description || '';
  }

  async function scrapeInstagramFromAboutPage(handle) {
    try {
      const res = await fetch(`https://www.youtube.com/@${handle}/about`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (!res.ok) return '';
      const html = await res.text();
      const match = html.match(/ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s);
      if (!match) return '';
      const str = JSON.stringify(JSON.parse(match[1]));
      const igMatch = str.match(/instagram\.com\/([a-zA-Z0-9._]{2,30})(?:["\/?])/i);
      return igMatch ? igMatch[1] : '';
    } catch {
      return '';
    }
  }

  function extractInstagramFromDescription(description) {
    if (!description) return '';
    const patterns = [
      /instagram\.com\/@?([a-zA-Z0-9._]{2,30})(?:[?\/\s]|$)/i,
      /\binstagram[:\s]+@?([a-zA-Z0-9._]{2,30})/i,
      /\big[:\s]+@?([a-zA-Z0-9._]{2,30})/i,
      /\binsta[:\s]+@?([a-zA-Z0-9._]{2,30})/i,
    ];
    for (const pat of patterns) {
      const m = description.match(pat);
      if (m && m[1]) return m[1].trim();
    }
    return '';
  }

  const channelMap = {};
  for (const ch of channelData.items || []) {
    channelMap[ch.id] = {
      subscriberCount: parseInt(ch.statistics?.subscriberCount || '0'),
      customUrl: ch.snippet?.customUrl || '',
      description: ch.brandingSettings?.channel?.description || ch.snippet?.description || '',
    };
  }

  // 3. Build producer objects
  const producers = searchData.items.map(item => {
    const channelId = item.snippet.channelId;
    const channelName = item.snippet.channelTitle;
    const videoTitle = item.snippet.title;
    const videoId = item.id.videoId;
    const channelInfo = channelMap[channelId] || {};
    const handle = channelInfo.customUrl
      ? channelInfo.customUrl.replace(/^@/, '')
      : channelId;
    const instagram =
      extractInstagramFromDescription(channelInfo.description || '') ||
      extractInstagramFromDescription(videoDescMap[videoId] || '');

    return {
      producer_name: channelName,
      channel_name: channelName,
      channel_url: `https://youtube.com/@${handle}`,
      video_title: videoTitle,
      video_url: `https://youtube.com/watch?v=${videoId}`,
      channel_subscribers: channelInfo.subscriberCount || 0,
      estimated_ig_followers: 0,
      instagram,
    };
  });

  // Enrich producers missing Instagram via About page scraping (max 5, sequential)
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const scrapeWithTimeout = (handle) =>
    Promise.race([
      scrapeInstagramFromAboutPage(handle),
      new Promise(resolve => setTimeout(() => resolve(''), 6000)),
    ]);

  const toScrape = producers.filter(p => !p.instagram).slice(0, 5);
  for (const p of toScrape) {
    const handle = p.channel_url.replace('https://youtube.com/@', '');
    p.instagram = await scrapeWithTimeout(handle);
    await sleep(400);
  }

  return res.status(200).json({ producers, nextPageToken: searchData.nextPageToken || null });
}
