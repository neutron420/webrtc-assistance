'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Brain, 
  Video, 
  BarChart2, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  User
} from 'lucide-react';

interface SidebarProps {
  onToggle?: (isOpen: boolean) => void;
}

export default function Sidebar({ onToggle }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('active_session_id');
    setActiveSessionId(id);
    
    // Notify parent of initial state
    if (onToggle) onToggle(isSidebarOpen);
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    if (onToggle) onToggle(newState);
  };

  const navLinks = [
    { name: 'Preparation', icon: Brain, path: '/dashboard' },
    { 
        name: 'Live Session', 
        icon: Video, 
        path: activeSessionId ? `/interview/${activeSessionId}` : null,
        onClick: () => {
            if (!activeSessionId) alert("No active session found. Start one from the Dashboard.");
        }
    },
    { 
        name: 'Analytics', 
        icon: BarChart2, 
        path: activeSessionId ? `/scorecard/OBS-${activeSessionId}` : null,
        onClick: () => {
            if (!activeSessionId) alert("No recent scorecard found.");
        }
    },
    { name: 'Profile', icon: User, path: '/profile' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('active_session_id');
    router.push('/login');
  };

  return (
    <aside 
      className={`h-screen fixed left-0 top-0 bg-[#1c1b1d] py-6 z-40 border-r border-[#2a2a2c] flex flex-col shadow-2xl transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'w-64 px-4' : 'w-20 px-3'
      } hidden lg:flex`}
    >
      {/* Collapse Toggle Button */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 bg-[#353437] border border-[#474747] text-white p-1 rounded-full hover:bg-[#474747] transition-colors z-50 shadow-lg"
      >
        {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Logo area */}
      <div className={`flex items-center ${isSidebarOpen ? 'justify-start px-2' : 'justify-center'} mb-10 h-8`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6ffbbe] to-[#00a572] flex items-center justify-center shrink-0">
          <span className="text-[#09090b] font-black text-xs">O.A</span>
        </div>
        {isSidebarOpen && (
          <span className="ml-3 font-bold text-white tracking-tight whitespace-nowrap">Obsidian AI</span>
        )}
      </div>

      {/* Nav Links */}
      <div className="flex flex-col gap-3 flex-grow pt-4">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.path || '!!!!');
          const Icon = link.icon;
          
          return (
            <button 
              key={link.name}
              onClick={() => {
                  if (link.onClick) link.onClick();
                  if (link.path) router.push(link.path);
              }}
              className={`flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center'} py-3 rounded-lg transition-all overflow-hidden ${
                isActive 
                  ? 'text-[#6ffbbe] bg-[#201f22] border-l-2 border-[#6ffbbe] scale-[1.02]' 
                  : 'text-[#c6c6c6] hover:bg-[#201f22] hover:text-white'
              }`}
              title={link.name}
            >
              <Icon size={20} className="shrink-0" />
              {isSidebarOpen && <span className="ml-3 text-sm font-medium tracking-wide whitespace-nowrap">{link.name}</span>}
            </button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-4 mt-auto">
        <button 
          onClick={handleLogout} 
          className={`flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center'} py-3 text-[#c6c6c6] hover:text-[#ffb4ab] hover:bg-[#ffb4ab]/10 rounded-lg transition-all overflow-hidden`}
          title="Logout"
        >
          <LogOut size={20} className="shrink-0" />
          {isSidebarOpen && <span className="ml-3 text-sm font-medium tracking-wide whitespace-nowrap">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
