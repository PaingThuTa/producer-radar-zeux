import React, { useState } from 'react';
import { api as base44 } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Radar, Play, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const defaultQueries = [
  'juice wrld type beat',
  'rod wave type beat',
  'polo g type beat',
  'nba youngboy type beat',
  'nocap type beat',
];

const SCAN_LIMITS = [
  { label: '50 videos (~10 new)', value: 50 },
  { label: '100 videos (~20 new)', value: 100 },
  { label: '200 videos (~35 new)', value: 200 },
];

// ─── Style ──────────────────────────────────────────────────────────────────
function classifyStyle(query, title) {
  const text = `${query} ${title}`.toLowerCase();
  if (text.includes('juice wrld') || text.includes('juice world')) return 'Juice WRLD';
  if (text.includes('polo g')) return 'Polo G';
  if (text.includes('rod wave')) return 'Rod Wave';
  if (text.includes('nba youngboy') || text.includes('youngboy')) return 'NBA YoungBoy';
  if (text.includes('emo') || text.includes('lil peep')) return 'Emo Trap';
  if (text.includes('melodic')) return 'Melodic Trap';
  return 'Melodic Trap';
}

// ─── Producer name extraction from title ────────────────────────────────────
function extractProducerFromTitle(title, channelName) {
  if (!title) return channelName;
  const patterns = [
    /prod(?:uced)?\s*(?:by|\.)\s*([A-Z][^\[\]()|,\n]+?)(?:\s*[\[\]()|,]|$)/i,
    /\|\s*prod(?:uced)?\s*(?:by|\.)\s*([A-Z][^\[\]()|,\n]+?)(?:\s*[\[\]()|,]|$)/i,
    /beat\s+by\s+([A-Z][^\[\]()|,\n]+?)(?:\s*[\[\]()|,]|$)/i,
    /\(prod\.\s*([^)]+)\)/i,
    /\[([^\]]+\s+beats?)\]/i,
    /\[([^\]]+\s+music)\]/i,
  ];
  for (const pat of patterns) {
    const m = title.match(pat);
    if (m && m[1]) {
      const name = m[1].trim().replace(/\s+/g, ' ');
      if (name.length >= 3 && name.length <= 40) return name;
    }
  }
  return channelName;
}

// ─── Subscriber count normalization ─────────────────────────────────────────
function parseSubscribers(subStr) {
  if (!subStr && subStr !== 0) return 0;
  if (typeof subStr === 'number') return subStr;
  const s = String(subStr).toLowerCase().replace(/,/g, '').trim();
  if (s.includes('k')) return Math.round(parseFloat(s) * 1000);
  if (s.includes('m')) return Math.round(parseFloat(s) * 1000000);
  return parseInt(s) || 0;
}

// ─── Priority scoring ────────────────────────────────────────────────────────
function placementScore(placementsText) {
  if (!placementsText) return 0;
  const t = placementsText.toLowerCase();
  const tier10 = ['drake', 'juice wrld', 'nba youngboy', 'lil baby', 'future', 'lil uzi'];
  const tier8 = ['polo g', 'rod wave', 'nocap', 'rylo rodriguez', 'fivio foreign', 'lil tjay'];
  const tier5 = ['yungbleu', 'toosii', 'jackboy', 'morray', 'big30', 'pooh shiesty'];
  if (tier10.some(a => t.includes(a))) return 10;
  if (tier8.some(a => t.includes(a))) return 8;
  if (tier5.some(a => t.includes(a))) return 5;
  if (t.length > 5) return 3;
  return 0;
}

function normalizeFollowers(followers) {
  if (!followers || followers < 50) return 0;
  if (followers < 1000) return 2;
  if (followers < 5000) return 5;
  if (followers < 10000) return 7;
  if (followers < 15000) return 8;
  return 9;
}

function normalizeSubscribers(subs) {
  if (!subs || subs < 100) return 0;
  if (subs < 5000) return 2;
  if (subs < 20000) return 4;
  if (subs < 50000) return 6;
  if (subs < 100000) return 8;
  return 10;
}

function calculatePriority(producer) {
  const ps = placementScore(producer.highlights_placements);
  const fs = normalizeFollowers(producer.followers_ig);
  const ys = normalizeSubscribers(producer.youtube_subscribers);
  // 60% placements, 20% IG followers, 20% YouTube subscribers
  let base = ps * 0.6 + fs * 0.2 + ys * 0.2;
  if (producer.instagram && producer.email) base += 0.8;
  else if (producer.instagram) base += 0.3;
  else base -= 0.5;
  return Math.min(10, Math.max(1, Math.round(base)));
}

// AI contact extraction — stubbed until OpenRouter integration is added
async function extractContactsWithAI() {
  return {};
}

// Fetch videos via YouTube Data API v3 (server-side)
async function fetchVideoBatch(query, pageToken = null) {
  const res = await fetch('/api/discovery/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, maxResults: 15, pageToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `YouTube API error (${res.status})`);
  return { producers: Array.isArray(data.producers) ? data.producers : [], nextPageToken: data.nextPageToken || null };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function DiscoveryRunner() {
  const [customQuery, setCustomQuery] = useState('');
  const [scanLimit, setScanLimit] = useState(100);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const queryClient = useQueryClient();

  const runDiscovery = async (query) => {
    setRunning(true);
    setProgress(`Searching: "${query}"...`);

    let log;
    try {
      log = await base44.entities.DiscoveryLog.create({
        query, source: 'YouTube', status: 'running',
        producers_found: 0, producers_added: 0, duplicates_skipped: 0, filtered_out: 0,
      });

      // Load existing for dupe check
      const existing = await base44.entities.YouTubeProducer.list('-created_date', 500);
      const existingNames = new Set(existing.map(p => p.name?.toLowerCase()));
      const existingIGs = new Set(
        existing.map(p => p.instagram?.toLowerCase().replace('@', '')).filter(Boolean)
      );

      let added = 0, dupes = 0, filtered = 0, totalFound = 0;
      const batchSize = 15;
      const maxBatches = Math.ceil(scanLimit / batchSize);
      const targetNew = Math.floor(scanLimit / 5);
      let currentPageToken = null;

      for (let batch = 0; batch < maxBatches; batch++) {
        if (added >= targetNew) break;

        setProgress(`Batch ${batch + 1}/${maxBatches} — scanning videos... (${added} added so far)`);
        const { producers: videos, nextPageToken } = await fetchVideoBatch(query, currentPageToken);
        currentPageToken = nextPageToken;
        totalFound += videos.length;

        for (let i = 0; i < videos.length; i++) {
          const p = videos[i];
          if (!p.producer_name) continue;

          const producerName = extractProducerFromTitle(p.video_title, p.producer_name) || p.channel_name;

          if (existingNames.has(producerName.toLowerCase())) { dupes++; continue; }
          if (p.estimated_ig_followers > 15000) { filtered++; continue; }

          setProgress(`Batch ${batch + 1} — [${i + 1}/${videos.length}] Enriching: ${producerName}... (${added} added)`);

          const contacts = await extractContactsWithAI(producerName, p.channel_name, p.video_title, query);

          const instagram = contacts?.instagram_handle?.replace(/^@/, '').trim() || '';
          const email = contacts?.email?.trim() || '';
          const followers = (contacts?.instagram_followers > 0) ? Math.round(contacts.instagram_followers) : p.estimated_ig_followers;
          const ytChannelUrl = p.channel_url || contacts?.youtube_channel_url || '';
          const ytSubscribers = parseSubscribers(contacts?.youtube_subscribers || p.channel_subscribers);
          const videoUrl = p.video_url || '';
          const rawHighlights = contacts?.highlights_placements || '';
          const highlights = rawHighlights.split(',').map(s => s.split(/\s*[-–]\s*/)[0].trim()).filter(Boolean).join(', ');
          const igBio = contacts?.instagram_bio || '';

          if (followers > 15000) { filtered++; continue; }
          if (instagram && existingIGs.has(instagram.toLowerCase())) { dupes++; continue; }

          const style = classifyStyle(query, p.video_title);

          const producerData = {
            name: producerName,
            youtube_channel: p.channel_name,
            youtube_channel_url: ytChannelUrl,
            youtube_subscribers: ytSubscribers,
            video_title: p.video_title,
            video_url: videoUrl,
            followers_ig: followers,
            instagram: instagram ? `@${instagram}` : '',
            email,
            highlights_placements: highlights,
            notes: igBio ? `IG Bio: ${igBio}` : '',
            style,
            source: 'YouTube',
            status: 'por contactar',
          };
          producerData.priority_score = calculatePriority(producerData);

          await base44.entities.YouTubeProducer.create(producerData);
          existingNames.add(producerName.toLowerCase());
          if (instagram) existingIGs.add(instagram.toLowerCase());
          added++;
        }

        if (!currentPageToken) break;
      }

      await base44.entities.DiscoveryLog.update(log.id, {
        status: 'completed',
        producers_found: totalFound,
        producers_added: added,
        duplicates_skipped: dupes,
        filtered_out: filtered,
      });

      queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
      queryClient.invalidateQueries({ queryKey: ['discovery-logs'] });
      toast.success(`Discovery complete: ${added} producers added`);
    } catch (err) {
      toast.error(err.message || 'Discovery failed');
      if (log?.id) {
        await base44.entities.DiscoveryLog.update(log.id, { status: 'error' }).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ['discovery-logs'] });
    } finally {
      setRunning(false);
      setProgress('');
    }
  };

  const runAllQueries = async () => {
    for (const q of defaultQueries) {
      await runDiscovery(q);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#2563eb]/10 flex items-center justify-center">
            <Radar className="w-4 h-4 text-[#3b82f6]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">YouTube Discovery</h2>
            <p className="text-xs text-[#71717a]">Search type beats and extract producers</p>
          </div>
          {/* Scan limit selector */}
          <div className="ml-auto">
            <Select value={String(scanLimit)} onValueChange={v => setScanLimit(Number(v))}>
              <SelectTrigger className="h-7 bg-[#0f0f10] border-[#27272a] text-[#a1a1aa] text-xs w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1e1e22] border-[#27272a]">
                {SCAN_LIMITS.map(l => (
                  <SelectItem key={l.value} value={String(l.value)} className="text-[#a1a1aa] text-xs">{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preset queries */}
        <div className="flex flex-wrap gap-2 mb-4">
          {defaultQueries.map(q => (
            <button key={q} onClick={() => !running && runDiscovery(q)} disabled={running}
              className="px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
              {q}
            </button>
          ))}
        </div>

        {/* Custom query */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
            <Input value={customQuery} onChange={e => setCustomQuery(e.target.value)}
              placeholder="Custom search query..."
              className="pl-10 bg-[#0f0f10] border-[#27272a] text-white text-sm rounded-lg"
              onKeyDown={e => e.key === 'Enter' && customQuery && !running && runDiscovery(customQuery)}
            />
          </div>
          <Button onClick={() => customQuery && runDiscovery(customQuery)} disabled={running || !customQuery}
            className="bg-[#2563eb] hover:bg-[#3b82f6] text-white rounded-lg" size="sm">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button onClick={runAllQueries} disabled={running} variant="outline" size="sm"
            className="border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a]">
            Run All
          </Button>
        </div>

        {/* Progress */}
        {running && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 flex items-center gap-2 px-3 py-2 bg-[#2563eb]/5 border border-[#2563eb]/20 rounded-lg"
          >
            <Loader2 className="w-4 h-4 animate-spin text-[#3b82f6]" />
            <span className="text-sm text-[#3b82f6]">{progress}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}