"use client";

import { useState } from "react";
import { List, X } from "@phosphor-icons/react";
import { AppSidebar } from "./AppSidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-[100dvh]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 md:static md:z-auto md:h-screen
          transition-transform duration-300 ease-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <AppSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <main className="relative flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-white/[0.07] bg-[#121315] px-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <List size={18} className="text-on-surface/60" />
          </button>
          <span className="text-sm font-bold text-on-surface">ScopeDrop</span>
        </div>

        {children}
      </main>
    </div>
  );
}
