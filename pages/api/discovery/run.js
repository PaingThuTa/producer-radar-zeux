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

  const channelRes = await fetch(channelUrl.toString());
  const channelData = await channelRes.json();

  function extractInstagramFromDescription(description) {
    if (!description) return '';
    const patterns = [
      /instagram\.com\/([a-zA-Z0-9._]{2,30})/i,
      /ig[:\s]+@?([a-zA-Z0-9._]{2,30})/i,
      /insta[:\s]+@?([a-zA-Z0-9._]{2,30})/i,
    ];
    for (const pat of patterns) {
      const m = description.match(pat);
      if (m && m[1]) return m[1].trim();
    }
    return '';
  }

  const channelMap = {};
  for (const ch of channelData.items || []) {
    const description = ch.brandingSettings?.channel?.description || '';
    channelMap[ch.id] = {
      subscriberCount: parseInt(ch.statistics?.subscriberCount || '0'),
      customUrl: ch.snippet?.customUrl || '',
      instagram: extractInstagramFromDescription(description),
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

    return {
      producer_name: channelName,
      channel_name: channelName,
      channel_url: `https://youtube.com/@${handle}`,
      video_title: videoTitle,
      video_url: `https://youtube.com/watch?v=${videoId}`,
      channel_subscribers: channelInfo.subscriberCount || 0,
      estimated_ig_followers: 0,
      instagram: channelInfo.instagram || '',
    };
  });

  return res.status(200).json({ producers, nextPageToken: searchData.nextPageToken || null });
}
