import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { toast } from 'sonner';

const FOLLOW_UP_STATUSES = ['contactado', 'follow up 1', 'follow up 2', 'follow up 3', 'follow up 4', 'follow up 5'];

async function fetchFollowUpCount() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [yt, pl] = await Promise.all([
    fetch('/api/youtube-producers?limit=500').then(r => r.json()),
    fetch('/api/placement-producers?limit=500').then(r => r.json()),
  ]);
  return [...yt, ...pl].filter(p => {
    if (!FOLLOW_UP_STATUSES.includes(p.status)) return false;
    if (!p.next_follow_up) return true;
    return p.next_follow_up <= todayStr;
  }).length;
}

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('followup-notified')) return;
    fetchFollowUpCount().then(count => {
      if (count > 0) {
        toast.info(`You have ${count} follow up${count > 1 ? 's' : ''} due today`);
      }
      sessionStorage.setItem('followup-notified', '1');
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f10]">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className={cn(
        "transition-all duration-300 ease-in-out min-h-screen",
        "ml-0 md:ml-[240px]",
        collapsed && "md:ml-[68px]"
      )}>
        {/* Mobile header */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-[#27272a] bg-[#18181b] md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-[#a1a1aa] hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-[15px] text-white tracking-tight">Producer Radar</span>
        </div>

        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}