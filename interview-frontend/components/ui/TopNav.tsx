"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Interviews", path: "/" },
  { label: "Scorecards", path: "/scorecards" },
  { label: "Resources", path: "/resources" },
];

const TopNav = () => {
  const pathname = usePathname();

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 fixed top-0 left-16 lg:left-56 right-0 z-20">
      <div className="flex items-center gap-1">
        <span className="font-bold text-foreground mr-6 md:hidden">Obsidian AI</span>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-foreground underline underline-offset-[18px] decoration-2 decoration-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
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
