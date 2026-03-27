'use client';

import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/Sidebar';
import AppSidebar from '@/components/ui/AppSidebar';
import TopNav from '@/components/ui/TopNav';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden relative">
        <AppSidebar variant="inset" />
        <SidebarInset className="flex flex-col flex-1 relative bg-background w-full">
          <TopNav />
          <main className="flex-1 w-full px-4 md:px-6 lg:px-8 pb-8 pt-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
