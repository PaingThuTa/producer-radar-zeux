import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api as base44 } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Search, Youtube, Music2 } from 'lucide-react';
import ProducerTable from '@/components/shared/ProducerTable';
import ProducerProfile from '@/components/shared/ProducerProfile';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Connections: producers with status "connection" (active real relationship)

export default function Connections() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [activeTab, setActiveTab] = useState('youtube');

  const queryClient = useQueryClient();

  const { data: ytProducers = [] } = useQuery({
    queryKey: ['youtube-producers'],
    queryFn: () => base44.entities.YouTubeProducer.list('-last_action', 5000),
  });
  const { data: plProducers = [] } = useQuery({
    queryKey: ['placement-producers'],
    queryFn: () => base44.entities.PlacementProducer.list('-last_action', 5000),
  });

  const updateYT = useMutation({
    mutationFn: ({ id, data }) => base44.entities.YouTubeProducer.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['youtube-producers'] }); setSelected(null); toast.success('Updated'); },
  });
  const updatePL = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlacementProducer.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['placement-producers'] }); setSelected(null); toast.success('Updated'); },
  });
  const deleteYT = useMutation({
    mutationFn: (id) => base44.entities.YouTubeProducer.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['youtube-producers'] }); setSelected(null); },
  });
  const deletePL = useMutation({
    mutationFn: (id) => base44.entities.PlacementProducer.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['placement-producers'] }); setSelected(null); },
  });

  const handleInstagramClick = (producer, type) => {
    const today = new Date().toISOString().split('T')[0];
    const nextFollowUp = new Date(); nextFollowUp.setDate(nextFollowUp.getDate() + 7);
    const nextFollowUpStr = nextFollowUp.toISOString().split('T')[0];
    const updateData = { last_action: today, next_follow_up: nextFollowUpStr };
    if (type === 'yt') {
      updateYT.mutate({ id: producer.id, data: updateData });
    } else {
      updatePL.mutate({ id: producer.id, data: updateData });
    }
  };

  const ytConnections = ytProducers
    .filter(p => p.status === 'connection')
    .map(p => ({ ...p, _type: 'yt' }));
  const plConnections = plProducers
    .filter(p => p.status === 'connection')
    .map(p => ({ ...p, _type: 'pl' }));

  const visibleConnections = (activeTab === 'youtube' ? ytConnections : plConnections)
    .filter(p => {
      const q = search.toLowerCase();
      return !search || p.name?.toLowerCase().includes(q) || p.instagram?.toLowerCase().includes(q);
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const ytColumns = ['name', 'instagram', 'phone', 'style', 'last_action', 'next_follow_up', 'status'];
  const plColumns = ['name', 'instagram', 'phone', 'style', 'placements', 'last_action', 'next_follow_up', 'status'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Connections</h1>
          <p className="text-[#71717a] text-sm mt-1">{ytConnections.length + plConnections.length} conexiones activas</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 p-1 bg-[#18181b] border border-[#27272a] rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('youtube')}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
            activeTab === 'youtube'
              ? "bg-[#27272a] text-white"
              : "text-[#71717a] hover:text-white"
          )}
        >
          <Youtube className="w-4 h-4 text-red-400" />
          YouTube
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full border",
            activeTab === 'youtube'
              ? "bg-red-500/10 text-red-400 border-red-500/20"
              : "bg-[#27272a] text-[#52525b] border-[#27272a]"
          )}>
            {ytConnections.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('placement')}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
            activeTab === 'placement'
              ? "bg-[#27272a] text-white"
              : "text-[#71717a] hover:text-white"
          )}
        >
          <Music2 className="w-4 h-4 text-purple-400" />
          Placement
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full border",
            activeTab === 'placement'
              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
              : "bg-[#27272a] text-[#52525b] border-[#27272a]"
          )}>
            {plConnections.length}
          </span>
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search connections..."
            className="pl-10 bg-[#18181b] border-[#27272a] text-white text-sm placeholder:text-[#52525b]" />
        </div>
      </div>

      <ProducerTable
        producers={visibleConnections}
        onRowClick={(p) => { setSelected(p); setSelectedType(p._type); }}
        columns={activeTab === 'youtube' ? ytColumns : plColumns}
        producerType={activeTab === 'youtube' ? 'youtube' : 'placement'}
        onInstagramClick={(p) => handleInstagramClick(p, p._type)}
      />

      {selected && (
        <ProducerProfile
          producer={selected}
          type={selectedType === 'yt' ? 'youtube' : 'placement'}
          onClose={() => setSelected(null)}
          onSave={data => {
            if (selectedType === 'yt') updateYT.mutate({ id: data.id, data });
            else updatePL.mutate({ id: data.id, data });
          }}
          onDelete={id => {
            if (selectedType === 'yt') deleteYT.mutate(id);
            else deletePL.mutate(id);
          }}
        />
      )}
    </div>
  );
}