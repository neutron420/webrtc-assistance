"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/Sidebar";
import { Logo } from "@/components/hero-section-1";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Interviews", path: "/" },
  { label: "Scorecards", path: "/scorecards" },
  { label: "Resources", path: "/resources" },
];

const TopNav = () => {
  const pathname = usePathname();

  return (
    <header className="sticky z-30 w-full px-4 lg:px-6 top-4 mb-4">
      <div className={cn('mx-auto max-w-4xl flex h-14 items-center justify-between rounded-2xl border bg-background/60 backdrop-blur-xl px-4 lg:px-6 shadow-xl shadow-black/5')}>
        
        <div className="flex items-center gap-1 md:gap-4">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          <Link href="/" className="flex items-center space-x-2 md:hidden">
              <Logo className="h-6 w-auto" />
          </Link>
          
          <div className="hidden md:flex items-center ml-2 border-l border-border/50 pl-6 gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted/50 rounded-lg",
                    isActive
                      ? "text-foreground font-bold bg-muted/80"
                      : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 border-l border-border/50 pl-2 md:pl-4">
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-colors hidden sm:block">
            <Bell className="w-4 h-4" />
          </button>
          
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors">
            <span className="text-[10px] md:text-sm font-bold text-primary">A</span>
          </div>

          <Link href="/login" className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors flex items-center gap-2" title="Log Out">
            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            <span className="sr-only">Log Out</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
