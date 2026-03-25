import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { MessageCircle, RefreshCw, Check, Instagram, Mail, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import PriorityBar from '@/components/shared/PriorityBar';
import StatusBadge from '@/components/shared/StatusBadge';
import QuickEditModal from '@/components/shared/QuickEditModal';
import { useAutoAdvanceStatus } from '@/components/shared/useAutoAdvanceStatus';
import { toast } from 'sonner';

const styleColors = {
  'Juice WRLD': 'text-purple-400','Polo G': 'text-sky-400','Rod Wave': 'text-teal-400',
  'NBA YoungBoy': 'text-red-400','Melodic Trap': 'text-indigo-400','Emo Trap': 'text-pink-400','Other': 'text-zinc-400',
};

function addDays(n) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0];
}

function randomDays(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getFollowUpDelay(toStatus) {
  if (toStatus === 'follow up 1') return 1;
  if (toStatus === 'follow up 2') return randomDays(2, 4);
  if (toStatus === 'follow up 3') return randomDays(5, 10);
  if (toStatus === 'follow up 4') return randomDays(5, 10);
  if (toStatus === 'follow up 5') return randomDays(5, 10);
  return null;
}

function formatFollowUpDate(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: 'text-red-400' };
  if (diff === 0) return { label: 'Today', color: 'text-amber-400' };
  if (diff === 1) return { label: 'Tomorrow', color: 'text-emerald-400' };
  return { label: `in ${diff}d`, color: 'text-[#71717a]' };
}


function DateChip({ dateStr }) {
  if (!dateStr) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20 whitespace-nowrap">
      No date
    </span>
  );
  const todayStr = new Date().toISOString().split('T')[0];
  if (dateStr < todayStr) {
    const diff = Math.round((new Date(todayStr) - new Date(dateStr)) / 86400000);
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20 whitespace-nowrap">
        {diff}d overdue
      </span>
    );
  }
  if (dateStr === todayStr) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20 whitespace-nowrap">
      Today
    </span>
  );
  const diff = Math.round((new Date(dateStr) - new Date(todayStr)) / 86400000);
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full border bg-zinc-700/50 text-zinc-400 border-zinc-700 whitespace-nowrap">
      in {diff}d
    </span>
  );
}

function GroupHeader({ label, color, count, textColor, badgeClass }) {
  return (
    <div className={`flex items-center gap-2 px-5 py-2 border-l-2 ${color} bg-white/[0.01]`}>
      <span className={`text-xs font-semibold uppercase tracking-wide ${textColor}`}>{label}</span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${badgeClass}`}>{count}</span>
    </div>
  );
}

export default function DailyContacts() {
  const queryClient = useQueryClient();
  const [editProducer, setEditProducer] = useState(null);
  const [filter, setFilter] = useState('all');

  const { data: ytProducers = [] } = useQuery({
    queryKey: ['youtube-producers'],
    queryFn: () => api.entities.YouTubeProducer.list('-priority', 5000),
  });
  const { data: plProducers = [] } = useQuery({
    queryKey: ['placement-producers'],
    queryFn: () => api.entities.PlacementProducer.list('-priority', 5000),
  });

  // Mark as contacted:
  // - si re_dms === 'no' → saltar a follow up 4 con next_follow_up = +7 días
  // - si no → status = 'contactado', next_follow_up = +1 día
  const markContactedYT = useMutation({
    mutationFn: ({ id, re_dms }) => {
      const today = new Date().toISOString().split('T')[0];
      if (re_dms === 'no') {
        return api.entities.YouTubeProducer.update(id, {
          status: 'follow up 4',
          date_contacted: today,
          last_action: today,
          next_follow_up: addDays(randomDays(5, 10)),
        });
      }
      return api.entities.YouTubeProducer.update(id, {
        status: 'contactado',
        date_contacted: today,
        last_action: today,
        next_follow_up: addDays(1),
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
      toast.success(vars.re_dms === 'no' ? 'Re-DMs no → Follow up 4 in 7 days' : 'Marked as contacted');
    },
  });

  const markContactedPL = useMutation({
    mutationFn: ({ id, re_dms }) => {
      const today = new Date().toISOString().split('T')[0];
      if (re_dms === 'no') {
        return api.entities.PlacementProducer.update(id, {
          status: 'follow up 4',
          last_action: today,
          next_follow_up: addDays(randomDays(5, 10)),
        });
      }
      return api.entities.PlacementProducer.update(id, {
        status: 'contactado',
        last_action: today,
        next_follow_up: addDays(1),
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
      toast.success(vars.re_dms === 'no' ? 'Re-DMs no → Follow up 4 in 7 days' : 'Marked as contacted');
    },
  });

  // Advance follow up: siguiente paso, si re_dms=no y ya está en follow up 4+ → archivar
  function getNextFollowUpStatus(currentStatus, re_dms) {
    if (currentStatus === 'contactado') return 'follow up 1';
    const followUps = ['follow up 1','follow up 2','follow up 3','follow up 4','follow up 5'];
    const idx = followUps.indexOf(currentStatus);
    const nextStatus = idx < followUps.length - 1 ? followUps[idx + 1] : 'archivado';
    return (re_dms === 'no' && idx >= 3) ? 'archivado' : nextStatus;
  }

  const advanceFollowUpYT = useMutation({
    mutationFn: ({ id, currentStatus, re_dms }) => {
      const finalStatus = getNextFollowUpStatus(currentStatus, re_dms);
      const delay = getFollowUpDelay(finalStatus);
      return api.entities.YouTubeProducer.update(id, {
        status: finalStatus,
        last_action: new Date().toISOString().split('T')[0],
        next_follow_up: delay != null ? addDays(delay) : null,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['youtube-producers'] }); toast.success('Follow up avanzado'); },
  });

  const advanceFollowUpPL = useMutation({
    mutationFn: ({ id, currentStatus, re_dms }) => {
      const finalStatus = getNextFollowUpStatus(currentStatus, re_dms);
      const delay = getFollowUpDelay(finalStatus);
      return api.entities.PlacementProducer.update(id, {
        status: finalStatus,
        last_action: new Date().toISOString().split('T')[0],
        next_follow_up: delay != null ? addDays(delay) : null,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['placement-producers'] }); toast.success('Follow up avanzado'); },
  });

  const igClickYT = useMutation({
    mutationFn: (id) => {
      const today = new Date().toISOString().split('T')[0];
      const next = new Date(); next.setDate(next.getDate() + 7);
      return api.entities.YouTubeProducer.update(id, { last_action: today, next_follow_up: next.toISOString().split('T')[0] });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['youtube-producers'] }),
  });

  const igClickPL = useMutation({
    mutationFn: (id) => {
      const today = new Date().toISOString().split('T')[0];
      const next = new Date(); next.setDate(next.getDate() + 7);
      return api.entities.PlacementProducer.update(id, { last_action: today, next_follow_up: next.toISOString().split('T')[0] });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['placement-producers'] }),
  });

  const today = new Date(); today.setHours(0,0,0,0);

  useAutoAdvanceStatus(ytProducers, plProducers, () => {
    queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
    queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
  });

  // Daily DMs: solo por contactar, top por prioridad
  const dailyDMs = [
    ...ytProducers.filter(p => p.status === 'por contactar').map(p => ({ ...p, _type: 'yt' })),
    ...plProducers.filter(p => p.status === 'por contactar').map(p => ({ ...p, _type: 'pl' })),
  ].sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 10);

  const todayStr = new Date().toISOString().split('T')[0];

  // All producers in follow-up pipeline, sorted oldest first
  const followUps = [
    ...ytProducers.filter(p => p.status?.startsWith('follow up') || p.status === 'contactado').map(p => ({ ...p, _type: 'yt' })),
    ...plProducers.filter(p => p.status?.startsWith('follow up') || p.status === 'contactado').map(p => ({ ...p, _type: 'pl' })),
  ].sort((a, b) => {
    const da = a.next_follow_up ? new Date(a.next_follow_up) : new Date(0);
    const db = b.next_follow_up ? new Date(b.next_follow_up) : new Date(0);
    return da - db;
  });

  const overdueItems = followUps.filter(p => !p.next_follow_up || p.next_follow_up < todayStr);
  const todayItems = followUps.filter(p => p.next_follow_up === todayStr);
  const upcomingItems = followUps.filter(p => p.next_follow_up && p.next_follow_up > todayStr);
  const dueCount = overdueItems.length + todayItems.length;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Daily Outreach</h1>
        <p className="text-[#71717a] text-sm mt-1">DMs del día y follow ups pendientes</p>
      </div>

      {/* ── Follow Ups Pendientes ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Follow Ups Pendientes</h2>
          {dueCount > 0 && (
            <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
              {dueCount} due
            </span>
          )}
          {upcomingItems.length > 0 && (
            <span className="text-xs bg-zinc-700/50 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full">
              {upcomingItems.length} upcoming
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 mb-4">
          {[
            { id: 'all', label: 'All', count: overdueItems.length + todayItems.length + upcomingItems.length },
            { id: 'overdue', label: 'Overdue', count: overdueItems.length },
            { id: 'today', label: 'Today', count: todayItems.length },
            { id: 'upcoming', label: 'Upcoming', count: upcomingItems.length },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${
                filter === opt.id
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-transparent text-[#71717a] border-[#27272a] hover:text-white hover:border-[#3f3f46]'
              }`}
            >
              {opt.label}
              {opt.count > 0 && (
                <span className={`text-[10px] px-1 rounded ${filter === opt.id ? 'bg-amber-500/20' : 'bg-[#27272a]'}`}>
                  {opt.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {(overdueItems.length === 0 && todayItems.length === 0 && upcomingItems.length === 0) ? (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-8 text-center text-[#3f3f46]">
            No follow ups pendientes
          </div>
        ) : (() => {
          const renderRow = (p) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02]">
              {/* Left: name + instagram + badges */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                {p.instagram && (
                  <a href={`https://instagram.com/${p.instagram.replace('@', '')}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={() => p._type === 'yt' ? igClickYT.mutate(p.id) : igClickPL.mutate(p.id)}
                    className="flex items-center gap-1 text-xs text-[#a1a1aa] hover:text-[#e1306c] transition-colors mt-0.5">
                    <Instagram className="w-3 h-3" />{p.instagram.replace('@', '')}
                  </a>
                )}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    p._type === 'yt'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  }`}>
                    {p._type === 'yt' ? 'YouTube' : 'Placement'}
                  </span>
                  <StatusBadge status={p.status} />
                  {p.re_dms === 'no' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                      Re-DMs: NO
                    </span>
                  )}
                </div>
              </div>
              {/* Middle: date chip */}
              <div className="flex-shrink-0">
                <DateChip dateStr={p.next_follow_up} />
              </div>
              {/* Right: priority + actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <PriorityBar score={p.priority || 0} max={p._type === 'yt' ? 8 : 10} />
                <Button size="sm" variant="ghost"
                  onClick={() => setEditProducer(p)}
                  className="text-[#71717a] hover:text-white hover:bg-[#27272a] p-2">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost"
                  onClick={() => p._type === 'yt'
                    ? advanceFollowUpYT.mutate({ id: p.id, currentStatus: p.status, re_dms: p.re_dms })
                    : advanceFollowUpPL.mutate({ id: p.id, currentStatus: p.status, re_dms: p.re_dms })}
                  className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 whitespace-nowrap">
                  <Check className="w-4 h-4 mr-1" /> Hecho
                </Button>
              </div>
            </div>
          );

          const showOverdue = filter === 'all' || filter === 'overdue';
          const showToday = filter === 'all' || filter === 'today';
          const showUpcoming = filter === 'all' || filter === 'upcoming';

          return (
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl divide-y divide-[#27272a]">
              {showOverdue && overdueItems.length > 0 && (
                <>
                  <GroupHeader label="Overdue" color="border-red-500" textColor="text-red-400" badgeClass="bg-red-500/10 text-red-400 border-red-500/20" count={overdueItems.length} />
                  {overdueItems.map(renderRow)}
                </>
              )}
              {showToday && todayItems.length > 0 && (
                <>
                  <GroupHeader label="Today" color="border-amber-500" textColor="text-amber-400" badgeClass="bg-amber-500/10 text-amber-400 border-amber-500/20" count={todayItems.length} />
                  {todayItems.map(renderRow)}
                </>
              )}
              {showUpcoming && upcomingItems.length > 0 && (
                <>
                  <GroupHeader label="Upcoming" color="border-zinc-500" textColor="text-zinc-400" badgeClass="bg-zinc-700/50 text-zinc-400 border-zinc-700" count={upcomingItems.length} />
                  {upcomingItems.map(renderRow)}
                </>
              )}
              {!showOverdue && !showToday && !showUpcoming && (
                <div className="p-8 text-center text-[#3f3f46]">No hay follow ups para este filtro</div>
              )}
            </div>
          );
        })()}
      </section>

      {/* ── Daily DMs ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-[#3b82f6]" />
          <h2 className="text-lg font-semibold text-white">Daily DMs</h2>
          <span className="text-xs bg-[#2563eb]/10 text-[#3b82f6] border border-[#2563eb]/20 px-2 py-0.5 rounded-full">
            Top {dailyDMs.length}
          </span>
        </div>

        {dailyDMs.length === 0 ? (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-8 text-center text-[#3f3f46]">
            No hay productores pendientes. ¡Usa Discovery para encontrar nuevos!
          </div>
        ) : (
          <div className="grid gap-3">
            {dailyDMs.map((p, i) => (
              <motion.div key={p.id}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 flex items-center gap-4 hover:border-[#3f3f46] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[#2563eb]/10 flex items-center justify-center text-sm font-bold text-[#3b82f6] flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                    {p.style && <span className={`text-xs ${styleColors[p.style?.split(',')[0]?.trim()] || 'text-zinc-400'}`}>{p.style.split(',')[0].trim()}</span>}
                    {p.re_dms === 'no' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                        Re-DMs: NO → FU4
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {p.instagram && (
                      <a href={`https://instagram.com/${p.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                        onClick={() => p._type === 'yt' ? igClickYT.mutate(p.id) : igClickPL.mutate(p.id)}
                        className="flex items-center gap-1 text-xs text-[#a1a1aa] hover:text-[#e1306c] transition-colors">
                        <Instagram className="w-3 h-3" />{p.instagram}
                      </a>
                    )}
                    {p.email && (
                      <a href={`mailto:${p.email}`} className="flex items-center gap-1 text-xs text-[#71717a] hover:text-[#3b82f6] transition-colors">
                        <Mail className="w-3 h-3" />{p.email}
                      </a>
                    )}
                    <span className="text-xs text-[#3f3f46]">
                      {p.followers_ig ? `${p.followers_ig.toLocaleString()} followers` : ''}
                    </span>
                  </div>
                </div>
                <PriorityBar score={p.priority || 0} max={p._type === 'yt' ? 8 : 10} />
                <Button size="sm" variant="ghost"
                  onClick={() => setEditProducer(p)}
                  className="text-[#71717a] hover:text-white hover:bg-[#27272a] p-2">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost"
                  onClick={() => p._type === 'yt'
                    ? markContactedYT.mutate({ id: p.id, re_dms: p.re_dms })
                    : markContactedPL.mutate({ id: p.id, re_dms: p.re_dms })}
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 whitespace-nowrap">
                  <Check className="w-4 h-4 mr-1" /> Enviado
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <QuickEditModal
        producer={editProducer}
        producerType={editProducer?._type}
        onClose={() => setEditProducer(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
          queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
        }}
      />
    </div>
  );
}