import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import ProducerTable from '@/components/shared/ProducerTable';
import Pagination from '@/components/shared/Pagination';
import ProducerProfile from '@/components/shared/ProducerProfile';
import AddProducerDialog from '@/components/shared/AddProducerDialog';
import BulkActionBar from '@/components/shared/BulkActionBar';
import CsvImportExport from '@/components/shared/CsvImportExport';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';

const statuses = ['all', 'por contactar', 'contactado', 'follow up 1', 'follow up 2', 'follow up 3', 'follow up 4', 'follow up 5', 'connection', 'archivado', 'eliminado'];
const plPriorities = ['all', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export default function PlacementProducers() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const queryClient = useQueryClient();

  const { data: producers = [] } = useQuery({
    queryKey: ['placement-producers'],
    queryFn: () => api.entities.PlacementProducer.list('-created_date', 5000),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.PlacementProducer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
      setSelected(null);
      toast.success('Producer updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.PlacementProducer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
      setSelected(null);
      toast.success('Producer deleted');
    },
  });

  const HIDDEN = ['archivado', 'eliminado', 'contactado', 'follow up 1', 'follow up 2', 'follow up 3', 'follow up 4', 'follow up 5'];
  const filtered = producers.filter(p => {
    if (statusFilter === 'all' && HIDDEN.includes(p.status)) return false;
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.artist?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || p.priority === parseInt(priorityFilter);
    return matchSearch && matchStatus && matchPriority;
  });

  const statusCounts = filtered.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handlePageChange = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (filtered.every(p => selectedIds.has(p.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const batchOp = async (ids, fn) => {
    const arr = [...ids];
    for (let i = 0; i < arr.length; i += 20) {
      await Promise.all(arr.slice(i, i + 20).map(id => fn(id)));
      if (i + 20 < arr.length) await new Promise(r => setTimeout(r, 200));
    }
  };

  const handleBulkUpdate = async (data) => {
    await batchOp(selectedIds, id => api.entities.PlacementProducer.update(id, data));
    queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
    toast.success(`Updated ${selectedIds.size} producers`);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    await batchOp(selectedIds, id => api.entities.PlacementProducer.delete(id));
    queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
    toast.success(`Deleted ${selectedIds.size} producers`);
    setSelectedIds(new Set());
  };

  const handleRowClick = (producer) => {
    setSelected(producer);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Placement Producers</h1>
          <p className="text-[#71717a] text-sm mt-1">{producers.length} producers from song credits</p>
        </div>
        <div className="flex items-center gap-2">
          <CsvImportExport
            producers={producers}
            entity={api.entities.PlacementProducer}
            type="placement"
            onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['placement-producers'] })}
          />
          <Button onClick={() => setShowAdd(true)} className="bg-[#2563eb] hover:bg-[#3b82f6] text-white" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add Producer
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or artist..."
            className="pl-10 bg-[#18181b] border-[#27272a] text-white text-sm rounded-lg" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-[#18181b] border-[#27272a] text-white text-sm rounded-lg">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1e1e22] border-[#27272a]">
            {statuses.map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s === 'all' ? 'All Statuses' : s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px] bg-[#18181b] border-[#27272a] text-white text-sm rounded-lg">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-[#1e1e22] border-[#27272a]">
            {plPriorities.map(p => (
              <SelectItem key={p} value={p} className="text-white">
                {p === 'all' ? 'All Priorities' : `Priority ${p}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <BulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkUpdate={handleBulkUpdate}
        onBulkDelete={handleBulkDelete}
        type="placement"
      />

      {Object.keys(statusCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {statuses
            .filter(s => s !== 'all' && statusCounts[s])
            .map(s => (
              <StatusBadge key={s} status={s} count={statusCounts[s]} />
            ))
          }
        </div>
      )}

      <ProducerTable
        producers={paginated}
        columns={['name', 'style', 'placements', 'instagram', 'priority', 'status']}
        producerType="placement"
        onRowClick={handleRowClick}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleAll}
        onToggleFavorite={p => updateMutation.mutate({ id: p.id, data: { favorite: !p.favorite } })}
        onInstagramClick={p => {
          const today = new Date().toISOString().split('T')[0];
          const next = new Date(); next.setDate(next.getDate() + 7);
          updateMutation.mutate({ id: p.id, data: { last_action: today, next_follow_up: next.toISOString().split('T')[0] } });
        }}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />

      {selected && (
        <ProducerProfile
          producer={selected}
          type="placement"
          onClose={() => setSelected(null)}
          onSave={data => updateMutation.mutate({ id: data.id, data })}
          onDelete={id => deleteMutation.mutate(id)}
        />
      )}

      {showAdd && (
        <AddProducerDialog
          type="placement"
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}