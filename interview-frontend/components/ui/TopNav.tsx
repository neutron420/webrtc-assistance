"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/Sidebar";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Interviews", path: "/" },
  { label: "Scorecards", path: "/scorecards" },
  { label: "Resources", path: "/resources" },
];

const TopNav = () => {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/90 px-3 backdrop-blur-sm sm:h-16 sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <SidebarTrigger className="h-9 w-9 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100" />
        <span className="shrink-0 font-bold text-foreground md:hidden">Obsidian AI</span>
        <div className="hidden min-w-0 items-center gap-1 overflow-x-auto md:flex">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-100 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <button className="p-2 text-muted-foreground transition-colors hover:text-foreground">
          <Bell className="w-5 h-5" />
        </button>
        <button className="hidden p-2 text-muted-foreground transition-colors hover:text-foreground sm:inline-flex">
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">A</span>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
