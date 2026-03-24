import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api as base44 } from '@/lib/api-client';
import { Radar, UserCheck, Clock, TrendingUp, ArrowRight, MessageCircle, RefreshCw, Instagram, Pencil } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import StatCard from '@/components/dashboard/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import PriorityBar from '@/components/shared/PriorityBar';
import QuickEditModal from '@/components/shared/QuickEditModal';
import { useAutoAdvanceStatus } from '@/components/shared/useAutoAdvanceStatus';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [editProducer, setEditProducer] = useState(null);

  const { data: ytProducers = [] } = useQuery({
    queryKey: ['youtube-producers'],
    queryFn: () => base44.entities.YouTubeProducer.list('-priority', 500),
  });

  const { data: placementProducers = [] } = useQuery({
    queryKey: ['placement-producers'],
    queryFn: () => base44.entities.PlacementProducer.list('-priority', 500),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['discovery-logs'],
    queryFn: () => base44.entities.DiscoveryLog.list('-created_date', 10),
  });

  const today = new Date().toISOString().split('T')[0];
  const todayProducers = ytProducers.filter(p => p.created_date?.startsWith(today));
  const highPriority = [...ytProducers, ...placementProducers].filter(p => (p.priority || 0) >= 7);
  const contacted = [...ytProducers, ...placementProducers].filter(p => p.status === 'contactado');

  const isFollowUpDue = (p) => {
    if (!p.status?.startsWith('follow up') && p.status !== 'contactado') return false;
    if (!p.next_follow_up) return true;
    return p.next_follow_up <= today;
  };

  const followUps = [...ytProducers, ...placementProducers].filter(isFollowUpDue);
  const overdueCount = followUps.filter(p => p.next_follow_up && p.next_follow_up < today).length;
  const todayCount = followUps.filter(p => p.next_follow_up === today).length;

  // Daily DMs: not yet contacted
  const dailyDMs = [...ytProducers, ...placementProducers]
    .filter(p => p.status === 'por contactar')
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 8);

  // Daily Follow Ups: overdue + today
  const dailyFollowUps = [...ytProducers, ...placementProducers]
    .filter(isFollowUpDue)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  useAutoAdvanceStatus(ytProducers, placementProducers, () => {
    queryClient.invalidateQueries({ queryKey: ['youtube-producers'] });
    queryClient.invalidateQueries({ queryKey: ['placement-producers'] });
  });

  const topProducers = [...ytProducers, ...placementProducers]
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-[#71717a] text-sm mt-1">Overview of your producer discovery network</p>
      </div>

      {/* Follow-up banner */}
      {followUps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex items-center justify-between px-5 py-4 bg-amber-500/5 border border-amber-500/20 border-l-4 border-l-amber-500 rounded-xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-white font-semibold">
                You have{' '}
                <span className="text-amber-400 text-lg font-bold">{followUps.length}</span>
                {' '}follow up{followUps.length > 1 ? 's' : ''} due
              </p>
              {(overdueCount > 0 || todayCount > 0) && (
                <p className="text-xs text-[#71717a] mt-0.5">
                  {overdueCount > 0 && `${overdueCount} overdue`}
                  {overdueCount > 0 && todayCount > 0 && ' · '}
                  {todayCount > 0 && `${todayCount} today`}
                </p>
              )}
            </div>
          </div>
          <Link href="/DailyContacts" className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors whitespace-nowrap">
            Go to Daily Outreach <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Discovered Today" value={todayProducers.length} icon={Radar} accentColor="#2563eb" />
        <StatCard title="High Priority" value={highPriority.length} icon={TrendingUp} accentColor="#22c55e" />
        <StatCard title="Contacted" value={contacted.length} icon={UserCheck} accentColor="#a855f7" />
        <StatCard title="Follow Ups" value={followUps.length} icon={Clock} accentColor="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Priority Producers */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#18181b] border border-[#27272a] rounded-xl"
        >
          <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
            <h2 className="text-sm font-semibold text-white">Top Priority Producers</h2>
            <Link href="/DailyContacts" className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#27272a]">
            {topProducers.length === 0 && (
              <div className="p-8 text-center text-[#3f3f46] text-sm">No producers yet. Start discovery!</div>
            )}
            {topProducers.map((p, i) => {
              const pType = ytProducers.find(y => y.id === p.id) ? 'yt' : 'pl';
              return (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#3f3f46] w-4 tabular-nums">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <p className="text-xs text-[#71717a]">{p.instagram || 'No IG'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBar score={p.priority || 0} max={10} />
                    <StatusBadge status={p.status || 'por contactar'} />
                    <button onClick={() => setEditProducer({ ...p, _type: pType })}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-[#27272a] text-[#71717a] hover:text-white">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Discovery Logs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#18181b] border border-[#27272a] rounded-xl"
        >
          <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
            <h2 className="text-sm font-semibold text-white">Recent Discovery Logs</h2>
            <Link href="/Discovery" className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#27272a]">
            {logs.length === 0 && (
              <div className="p-8 text-center text-[#3f3f46] text-sm">No discovery runs yet</div>
            )}
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{log.query}</p>
                  <p className="text-xs text-[#71717a]">{log.source} · {new Date(log.created_date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#a1a1aa]">
                    +{log.producers_added || 0} added
                  </span>
                  <StatusBadge status={log.status || 'completed'} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Daily Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily DMs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#18181b] border border-[#27272a] rounded-xl"
        >
          <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#3b82f6]" />
              <h2 className="text-sm font-semibold text-white">Daily DMs</h2>
              <span className="text-xs bg-[#2563eb]/10 text-[#3b82f6] border border-[#2563eb]/20 px-2 py-0.5 rounded-full">{dailyDMs.length}</span>
            </div>
            <Link href="/DailyContacts" className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#27272a]">
            {dailyDMs.length === 0 && (
              <div className="p-8 text-center text-[#3f3f46] text-sm">No producers to DM today</div>
            )}
            {dailyDMs.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02]">
                <div>
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  {p.instagram && (
                    <a href={`https://instagram.com/${p.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#71717a] hover:text-[#e1306c] transition-colors mt-0.5">
                      <Instagram className="w-3 h-3" />{p.instagram}
                    </a>
                  )}
                </div>
                <PriorityBar score={p.priority || 0} max={10} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Daily Follow Ups */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#18181b] border border-[#27272a] rounded-xl"
        >
          <div className="flex items-center justify-between p-5 border-b border-[#27272a]">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Daily Follow Ups</h2>
              <span className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full">{dailyFollowUps.length}</span>
            </div>
            <Link href="/DailyContacts" className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#27272a]">
            {dailyFollowUps.length === 0 && (
              <div className="p-8 text-center text-[#3f3f46] text-sm">No follow ups due today</div>
            )}
            {dailyFollowUps.map(p => {
              const pType = ytProducers.find(y => y.id === p.id) ? 'yt' : 'pl';
              return (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] group">
                  <div>
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    <p className="text-xs text-amber-400 mt-0.5">{p.status}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBar score={p.priority || 0} max={10} />
                    <button onClick={() => setEditProducer({ ...p, _type: pType })}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-[#27272a] text-[#71717a] hover:text-white">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Total Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#18181b] border border-[#27272a] rounded-xl p-5"
      >
        <h2 className="text-sm font-semibold text-white mb-4">Network Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-bold text-white">{ytProducers.length}</p>
            <p className="text-xs text-[#71717a] mt-0.5">YouTube Producers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{placementProducers.length}</p>
            <p className="text-xs text-[#71717a] mt-0.5">Placement Producers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{[...ytProducers, ...placementProducers].filter(p => p.email).length}</p>
            <p className="text-xs text-[#71717a] mt-0.5">Emails Found</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{logs.length}</p>
            <p className="text-xs text-[#71717a] mt-0.5">Discovery Runs</p>
          </div>
        </div>
      </motion.div>
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