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
      <div className="flex min-h-screen w-full bg-zinc-50/50 text-zinc-900">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <header className="flex h-14 items-center gap-4 border-b bg-white px-6 lg:h-[60px]">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1">
              <h1 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Dashboard</h1>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
