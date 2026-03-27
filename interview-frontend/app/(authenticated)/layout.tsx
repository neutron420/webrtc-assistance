'use client';

import React from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/Sidebar';
import AppSidebar from '@/components/ui/AppSidebar';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full overflow-hidden bg-zinc-50/80 text-zinc-900">
        <AppSidebar />
        <SidebarInset className="min-w-0 overflow-hidden transition-[width,margin] duration-200 ease-linear">
            <header className=" top-0 z-20 h-14 flex items-center gap-3 border-b border-zinc-200/80 bg-white/90 px-3 backdrop-blur sm:h-16 sm:px-4 lg:px-6">
            <SidebarTrigger className="h-9 w-9 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold uppercase tracking-[0.24em] text-zinc-900 sm:text-[13px]">
                Dashboard
              </h1>
              <p className="truncate text-xs text-zinc-500 sm:hidden">Interview workspace</p>
            </div>
          </header>
          <main className=" min-w-0 flex-1 px-3 py-4 sm:px-4 sm:py-5 md:px-6 lg:px-8 lg:py-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
