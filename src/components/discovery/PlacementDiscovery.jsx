import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Music2, Loader2, Check, Plus, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function PlacementDiscovery() {
  const [links, setLinks] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | running | done
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const run = async () => {
    const urls = links
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.includes('genius.com'));

    if (urls.length === 0) {
      toast.error('Paste at least one Genius link');
      return;
    }

    setPhase('running');
    setResult(null);

    try {
      const res = await fetch('/api/discovery/placement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Discovery failed');
        setPhase('idle');
        return;
      }

      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
      toast.success(`Added ${data.added} producer${data.added !== 1 ? 's' : ''}`);
      setPhase('done');
    } catch (err) {
      toast.error(err.message || 'Unexpected error');
      setPhase('idle');
    }
  };

  const reset = () => {
    setPhase('idle');
    setLinks('');
    setResult(null);
  };

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <Music2 className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Placement Discovery</h2>
          <p className="text-xs text-[#71717a]">Extract producers from Genius songs via the official API</p>
        </div>
      </div>

      {/* INPUT */}
      {phase === 'idle' && (
        <div className="space-y-3">
          <Textarea
            value={links}
            onChange={e => setLinks(e.target.value)}
            placeholder={"Paste Genius links, one per line:\nhttps://genius.com/artist-song-lyrics\nhttps://genius.com/artist-song2-lyrics"}
            className="bg-[#0f0f10] border-[#27272a] text-white text-sm min-h-[120px] placeholder:text-[#3f3f46]"
          />
          <Button
            onClick={run}
            disabled={!links.trim()}
            className="bg-purple-600 hover:bg-purple-500 text-white w-full"
            size="sm"
          >
            <Zap className="w-4 h-4 mr-2" /> Extract Producers
          </Button>
        </div>
      )}

      {/* RUNNING */}
      {phase === 'running' && (
        <div className="flex items-center gap-2 px-3 py-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400 flex-shrink-0" />
          <span className="text-sm text-purple-300">Fetching from Genius API...</span>
        </div>
      )}

      {/* DONE */}
      {phase === 'done' && result && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Producers found', value: result.found },
              { label: 'Added to DB', value: result.added },
              { label: 'Duplicates', value: result.duplicates },
            ].map(s => (
              <div key={s.label} className="bg-[#0f0f10] border border-[#27272a] rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-[#71717a] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {result.songResults?.length > 0 && (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {result.songResults.map((s, i) => (
                <div key={i} className="px-3 py-2 bg-[#0f0f10] border border-[#27272a] rounded-lg text-xs">
                  {s.skipped ? (
                    <span className="text-[#71717a]">Skipped — {s.reason}</span>
                  ) : (
                    <div>
                      <p className="text-white font-medium truncate">{s.song}{s.artist ? ` — ${s.artist}` : ''}</p>
                      <p className="text-[#71717a] mt-0.5">
                        {s.producers?.length > 0
                          ? s.producers.map(p => p.name).join(', ')
                          : 'No producers found'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/5 border border-green-500/20 rounded-lg">
            <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <span className="text-xs text-green-400">Producers saved with source: Genius API</span>
          </div>

          <Button variant="ghost" size="sm" onClick={reset}
            className="w-full text-[#a1a1aa] hover:text-white border border-[#27272a]">
            <Plus className="w-4 h-4 mr-1.5" /> Discover More
          </Button>
        </div>
      )}
    </div>
  );
}
