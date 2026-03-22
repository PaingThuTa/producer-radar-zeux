import React, { useState } from 'react';
import { api as base44 } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Music2, Loader2, Check, Plus, Zap, X, Instagram, Users } from 'lucide-react';
import { toast } from 'sonner';

function ProducerCard({ producer, selected, onToggle }) {
  if (producer.isDuplicate) {
    return (
      <div className="rounded-lg border border-[#27272a] bg-[#0f0f10] p-3 opacity-40">
        <div className="flex items-center justify-between gap-2">
          <p className="text-white text-sm font-semibold truncate">{producer.name}</p>
          <span className="text-[10px] text-[#71717a] flex-shrink-0">already in DB</span>
        </div>
        {producer.song && (
          <p className="text-[#71717a] text-[11px] mt-1 truncate">
            {producer.song}{producer.artist ? ` — ${producer.artist}` : ''}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onToggle}
      className={`cursor-pointer rounded-lg border p-3 transition-all ${
        selected
          ? 'border-purple-500/50 bg-purple-500/5'
          : 'border-[#27272a] bg-[#0f0f10] opacity-60'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded-sm flex-shrink-0 flex items-center justify-center border transition-colors ${selected ? 'bg-purple-500 border-purple-500' : 'border-[#3f3f46]'}`}>
          {selected && <Check className="w-2.5 h-2.5 text-white" />}
        </div>
        <p className="text-white text-sm font-semibold truncate">{producer.name}</p>
      </div>
      {producer.song && (
        <p className="text-[#71717a] text-[11px] mt-1.5 truncate pl-6">
          {producer.song}{producer.artist ? ` — ${producer.artist}` : ''}
        </p>
      )}
      {producer.instagram && (
        <p className="text-purple-400 text-[11px] mt-1 flex items-center gap-1 pl-6">
          <Instagram className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{producer.instagram}</span>
        </p>
      )}
    </div>
  );
}

export default function PlacementDiscovery() {
  const [links, setLinks] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | running | preview | saving | done
  const [producers, setProducers] = useState([]);
  const [selectedNames, setSelectedNames] = useState(new Set());
  const [doneStats, setDoneStats] = useState({ found: 0, added: 0, duplicates: 0 });
  const queryClient = useQueryClient();

  const toggleSelect = (name) => {
    setSelectedNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    const selectable = producers.filter(p => !p.isDuplicate).map(p => p.name);
    setSelectedNames(prev =>
      prev.size === selectable.length ? new Set() : new Set(selectable)
    );
  };

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
    setProducers([]);
    setSelectedNames(new Set());

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

      const found = data.producers || [];
      if (found.length === 0) {
        toast.error('No producers found in those Genius pages');
        setPhase('idle');
        return;
      }

      setProducers(found);
      // Pre-select all non-duplicates
      setSelectedNames(new Set(found.filter(p => !p.isDuplicate).map(p => p.name)));
      setPhase('preview');
    } catch (err) {
      toast.error(err.message || 'Unexpected error');
      setPhase('idle');
    }
  };

  const saveSelected = async () => {
    setPhase('saving');
    let added = 0;

    for (const producer of producers) {
      if (!selectedNames.has(producer.name)) continue;
      try {
        await base44.entities.PlacementProducer.create({
          name: producer.name,
          instagram: producer.instagram || undefined,
          song: producer.song || undefined,
          artist: producer.artist || undefined,
          source: 'Genius API',
          status: 'por contactar',
        });
        added++;
      } catch {
        // Skip individual failures silently — don't abort the whole batch
      }
    }

    const duplicates = producers.filter(p => p.isDuplicate).length;
    setDoneStats({ found: producers.length, added, duplicates });
    queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
    toast.success(`Added ${added} producer${added !== 1 ? 's' : ''}`);
    setPhase('done');
  };

  const reset = () => {
    setPhase('idle');
    setLinks('');
    setProducers([]);
    setSelectedNames(new Set());
    setDoneStats({ found: 0, added: 0, duplicates: 0 });
  };

  const selectableCount = producers.filter(p => !p.isDuplicate).length;

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

      {/* RUNNING / SAVING */}
      {(phase === 'running' || phase === 'saving') && (
        <div className="flex items-center gap-2 px-3 py-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400 flex-shrink-0" />
          <span className="text-sm text-purple-300">
            {phase === 'running' ? 'Fetching from Genius API...' : 'Saving to database...'}
          </span>
        </div>
      )}

      {/* PREVIEW */}
      {phase === 'preview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">{producers.length} producers found</span>
              <span className="text-xs text-[#71717a]">— {selectedNames.size} selected</span>
            </div>
            {selectableCount > 0 && (
              <button onClick={toggleAll} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                {selectedNames.size === selectableCount ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
            {producers.map(p => (
              <ProducerCard
                key={p.name}
                producer={p}
                selected={selectedNames.has(p.name)}
                onToggle={() => !p.isDuplicate && toggleSelect(p.name)}
              />
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={reset} className="text-[#a1a1aa] hover:text-white border border-[#27272a]">
              <X className="w-4 h-4 mr-1.5" /> Cancel
            </Button>
            <Button
              size="sm"
              onClick={saveSelected}
              disabled={selectedNames.size === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
            >
              <Check className="w-4 h-4 mr-1.5" /> Save {selectedNames.size} Producer{selectedNames.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {/* DONE */}
      {phase === 'done' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Producers found', value: doneStats.found },
              { label: 'Added to DB', value: doneStats.added },
              { label: 'Duplicates', value: doneStats.duplicates },
            ].map(s => (
              <div key={s.label} className="bg-[#0f0f10] border border-[#27272a] rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-[#71717a] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

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
