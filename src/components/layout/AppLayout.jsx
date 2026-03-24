import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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