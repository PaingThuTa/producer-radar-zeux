import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Plus, Eye } from 'lucide-react';
import ProducerTable from '@/components/shared/ProducerTable';
import Pagination from '@/components/shared/Pagination';
import ProducerProfile from '@/components/shared/ProducerProfile';
import AddProducerDialog from '@/components/shared/AddProducerDialog';
import BulkActionBar from '@/components/shared/BulkActionBar';
import CsvImportExport from '@/components/shared/CsvImportExport';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';

const statuses = ['all', 'por contactar', 'contactado', 'follow up 1', 'follow up 2', 'follow up 3', 'follow up 4', 'follow up 5', 'connection', 'archivado', 'eliminado'];
const ytPriorities = ['all', '1', '2', '3', '4', '5'];
const ALWAYS_VISIBLE = ['name', 'instagram', 'status', 'priority'];
const OPTIONAL_COLS = ['youtube', 'subscribers', 'style', 'placements', 'next_follow_up', 'last_action', 'type', 'email', 'donde_enviar', 'que_enviar', 're_dms', 'followers_ig', 'notes'];
const COL_LABELS = { youtube: 'YouTube', subscribers: 'Subscribers', style: 'Style', placements: 'Placements', next_follow_up: 'Next FU', last_action: 'Last Action', type: 'Type', email: 'Email', donde_enviar: 'Donde Enviar', que_enviar: 'Qué Enviar', re_dms: 'Re-DMs', followers_ig: 'IG Followers', notes: 'Notes' };
const LS_KEY = 'youtube-col-visibility';
const subRanges = [
  { label: 'All Subscribers', value: 'all' },
  { label: '< 1K', value: 'lt1k' },
  { label: '1K – 10K', value: '1k-10k' },
  { label: '10K – 100K', value: '10k-100k' },
  { label: '100K – 500K', value: '100k-500k' },
  { label: '500K+', value: 'gt500k' },
];
const ADVANCED_FILTER_FIELDS = [
  { value: 'artist', label: 'Artist' },
  { value: 'highlights_placements', label: 'Placements' },
  { value: 'donde_enviar', label: 'Donde Enviar' },
  { value: 'que_enviar', label: 'Qué Enviar' },
  { value: 'status', label: 'Status' },
  { value: 'style', label: 'Style' },
  { value: 're_dms', label: 'Re-DMs' },
  { value: 'name', label: 'Name' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'email', label: 'Email' },
  { value: 'notes', label: 'Notes' },
];
const ADVANCED_FILTER_OPERATORS = [
  { value: 'contains', label: 'contains' },
  { value: 'does_not_contain', label: 'does not contain' },
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

function createFilterRule() {
  return { id: crypto.randomUUID(), field: 'artist', operator: 'contains', value: '' };
}

function normalizeFilterValue(value) {
  return String(value ?? '').trim().toLowerCase();
}

function matchesAdvancedRule(producer, rule) {
  const fieldValue = normalizeFilterValue(producer?.[rule.field]);
  const ruleValue = normalizeFilterValue(rule.value);

  if (rule.operator === 'is_empty') return fieldValue === '';
  if (rule.operator === 'is_not_empty') return fieldValue !== '';
  if (rule.operator === 'contains') return fieldValue.includes(ruleValue);
  if (rule.operator === 'does_not_contain') return !fieldValue.includes(ruleValue);
  if (rule.operator === 'is') return fieldValue === ruleValue;
  if (rule.operator === 'is_not') return fieldValue !== ruleValue;
  return true;
}

export default function YouTubeProducers() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [subFilter, setSubFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [advancedFilters, setAdvancedFilters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [colVisibility, setColVisibility] = useState(() => {
    if (typeof window === 'undefined') return Object.fromEntries(OPTIONAL_COLS.map(k => [k, true]));
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) return { ...Object.fromEntries(OPTIONAL_COLS.map(k => [k, true])), ...JSON.parse(stored) };
    } catch {}
    return Object.fromEntries(OPTIONAL_COLS.map(k => [k, true]));
  });
  const [showColPanel, setShowColPanel] = useState(false);
  const colPanelRef = useRef(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const queryClient = useQueryClient();

  const { data: producers = [], isLoading } = useQuery({
    queryKey: ['youtube-producers'],
    queryFn: () => api.entities.YouTubeProducer.list('-created_date', 5000),
  });

  const styles = useMemo(
    () => ['all', ...[...new Set(producers.map(p => p.style).filter(Boolean))].sort()],
    [producers]
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colPanelRef.current && !colPanelRef.current.contains(event.target)) {
        setShowColPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.YouTubeProducer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
      setSelected(null);
      toast.success('Producer updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.YouTubeProducer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
      setSelected(null);
      toast.success('Producer deleted');
    },
  });

  const HIDDEN = ['archivado', 'eliminado', 'contactado', 'follow up 1', 'follow up 2', 'follow up 3', 'follow up 4', 'follow up 5'];
  const activeAdvancedFilters = advancedFilters.filter(rule => rule.operator === 'is_empty' || rule.operator === 'is_not_empty' || normalizeFilterValue(rule.value) !== '');
  const filtered = producers.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.instagram?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchHidden = search || statusFilter !== 'all' || !HIDDEN.includes(p.status);
    const matchStyle = styleFilter === 'all' || p.style === styleFilter;
    const s = p.youtube_subscribers || 0;
    const matchSubs = subFilter === 'all' ||
      (subFilter === 'lt1k' && s < 1000) ||
      (subFilter === '1k-10k' && s >= 1000 && s < 10000) ||
      (subFilter === '10k-100k' && s >= 10000 && s < 100000) ||
      (subFilter === '100k-500k' && s >= 100000 && s < 500000) ||
      (subFilter === 'gt500k' && s >= 500000);
    const matchPriority = priorityFilter === 'all' || p.priority === parseInt(priorityFilter);
    const matchAdvanced = activeAdvancedFilters.every(rule => matchesAdvancedRule(p, rule));
    return matchSearch && matchStatus && matchHidden && matchStyle && matchSubs && matchPriority && matchAdvanced;
  });

  const statusCounts = filtered.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handlePageChange = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, styleFilter, subFilter, priorityFilter, advancedFilters]);

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
    await batchOp(selectedIds, id => api.entities.YouTubeProducer.update(id, data));
    queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
    toast.success(`Updated ${selectedIds.size} producers`);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    await batchOp(selectedIds, id => api.entities.YouTubeProducer.delete(id));
    queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
    toast.success(`Deleted ${selectedIds.size} producers`);
    setSelectedIds(new Set());
  };

  const toggleCol = (key) => {
    setColVisibility(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const visibleColumns = [
    ...ALWAYS_VISIBLE,
    ...OPTIONAL_COLS.filter(k => colVisibility[k]),
  ];

  const handleRowClick = (producer) => {
    setSelected(producer);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white">YouTube Producers</h1>
          <p className="text-[#71717a] text-sm mt-1">{producers.length} producers discovered</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative" ref={colPanelRef}>
            <Button
              onClick={() => setShowColPanel(v => !v)}
              variant="outline"
              size="sm"
              className="border-[#27272a] bg-[#18181b] text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
            >
              <Eye className="w-4 h-4 mr-1.5" /> Columns
            </Button>
            {showColPanel && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-[#1e1e22] border border-[#27272a] rounded-lg p-3 w-52 shadow-xl">
                <p className="text-[#71717a] text-xs font-medium mb-2 uppercase tracking-wide">Toggle Columns</p>
                {OPTIONAL_COLS.map(key => (
                  <label key={key} className="flex items-center gap-2 py-1 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={colVisibility[key] ?? true}
                      onChange={() => toggleCol(key)}
                      className="w-3.5 h-3.5 rounded-sm accent-[#3b82f6] cursor-pointer"
                    />
                    <span className="text-sm text-[#a1a1aa] group-hover:text-white transition-colors">{COL_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <CsvImportExport
            producers={producers}
            entity={api.entities.YouTubeProducer}
            type="youtube"
            onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['youtube-producers'] })}
          />
          <Button onClick={() => setShowAdd(true)} className="bg-[#2563eb] hover:bg-[#3b82f6] text-white" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add Producer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-wide text-[#71717a]">Filters</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAdvancedFilters(prev => [...prev, createFilterRule()])}
            className="border-[#27272a] bg-[#18181b] text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
          >
            Add Filter
          </Button>
        </div>
        {advancedFilters.length > 0 && (
          <div className="space-y-2 rounded-xl border border-[#27272a] bg-[#18181b] p-3">
            {advancedFilters.map(rule => {
              const hideValueInput = rule.operator === 'is_empty' || rule.operator === 'is_not_empty';
              return (
                <div key={rule.id} className="flex flex-wrap items-center gap-2">
                  <Select value={rule.field} onValueChange={value => setAdvancedFilters(prev => prev.map(item => item.id === rule.id ? { ...item, field: value } : item))}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-[#18181b] border-[#27272a] text-white text-sm">
                      <SelectValue placeholder="Property" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1e22] border-[#27272a]">
                      {ADVANCED_FILTER_FIELDS.map(field => <SelectItem key={field.value} value={field.value} className="text-white">{field.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={rule.operator} onValueChange={value => setAdvancedFilters(prev => prev.map(item => item.id === rule.id ? { ...item, operator: value } : item))}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-[#18181b] border-[#27272a] text-white text-sm">
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1e22] border-[#27272a]">
                      {ADVANCED_FILTER_OPERATORS.map(operator => <SelectItem key={operator.value} value={operator.value} className="text-white">{operator.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {!hideValueInput && (
                    <Input
                      value={rule.value}
                      onChange={e => setAdvancedFilters(prev => prev.map(item => item.id === rule.id ? { ...item, value: e.target.value } : item))}
                      placeholder="Value"
                      className="w-full sm:flex-1 bg-[#18181b] border-[#27272a] text-white text-sm"
                    />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAdvancedFilters(prev => prev.filter(item => item.id !== rule.id))}
                    className="text-[#71717a] hover:text-white hover:bg-[#27272a]"
                  >
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-0 w-full sm:w-auto sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a]" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or Instagram..."
            className="pl-10 bg-[#18181b] border-[#27272a] text-white text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px] bg-[#18181b] border-[#27272a] text-white text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1e1e22] border-[#27272a]">
            {statuses.map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s === 'all' ? 'All Statuses' : s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={styleFilter} onValueChange={setStyleFilter}>
          <SelectTrigger className="w-full sm:w-[160px] bg-[#18181b] border-[#27272a] text-white text-sm">
            <SelectValue placeholder="Style" />
          </SelectTrigger>
          <SelectContent className="bg-[#1e1e22] border-[#27272a]">
            {styles.map(s => <SelectItem key={s} value={s} className="text-white">{s === 'all' ? 'All Styles' : s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={subFilter} onValueChange={setSubFilter}>
          <SelectTrigger className="w-full sm:w-[160px] bg-[#18181b] border-[#27272a] text-white text-sm">
            <SelectValue placeholder="Subscribers" />
          </SelectTrigger>
          <SelectContent className="bg-[#1e1e22] border-[#27272a]">
            {subRanges.map(r => <SelectItem key={r.value} value={r.value} className="text-white">{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[140px] bg-[#18181b] border-[#27272a] text-white text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-[#1e1e22] border-[#27272a]">
            {ytPriorities.map(p => (
              <SelectItem key={p} value={p} className="text-white">
                {p === 'all' ? 'All Priorities' : `Priority ${p}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      </div>

      <BulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkUpdate={handleBulkUpdate}
        onBulkDelete={handleBulkDelete}
        type="youtube"
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
        columns={visibleColumns}
        producerType="youtube"
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
          type="youtube"
          onClose={() => setSelected(null)}
          onSave={data => updateMutation.mutate({ id: data.id, data })}
          onDelete={id => deleteMutation.mutate(id)}
        />
      )}

      {showAdd && (
        <AddProducerDialog
          type="youtube"
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}