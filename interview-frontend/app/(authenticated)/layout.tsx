'use client';

import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex bg-[#09090b] min-h-screen">
      <Sidebar onToggle={(open) => setIsSidebarOpen(open)} />
      
      <main className={`flex-grow transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {children}
      </main>
    </div>
  );
}
