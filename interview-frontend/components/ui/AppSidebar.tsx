"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headphones, Video, BarChart3, Settings, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { icon: Headphones, label: "PREPARATION", path: "/" },
  { icon: Video, label: "LIVE SESSION", path: "/live" },
  { icon: BarChart3, label: "ANALYTICS", path: "/scorecards" },
  { icon: Settings, label: "SETTINGS", path: "/settings" },
];

const AppSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-16 lg:w-56 bg-sidebar border-r border-sidebar-border min-h-screen fixed left-0 top-0 z-30">
      <div className="p-4 lg:p-6">
        <h1 className="hidden lg:block text-foreground font-bold text-lg">Intelliview AI</h1>
        {/* <p className="hidden lg:block text-primary text-xs font-semibold tracking-wider mt-0.5">PREMIUM TIER</p> */}
      </div>

      <nav className="flex-1 mt-4 space-y-1 px-2 lg:px-3">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg text-xs font-semibold tracking-wider transition-colors relative",
                isActive
                  ? "text-primary bg-sidebar-accent"
                  : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-full" />
              )}
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-2 lg:px-3 pb-6 space-y-1">
        <button className="hidden lg:flex w-full items-center justify-center py-2.5 rounded-lg border border-border text-xs font-semibold tracking-wider text-muted-foreground hover:text-foreground transition-colors">
          UPGRADE TO PRO
        </button>
        <button className="flex items-center gap-3 px-3 py-3 rounded-lg text-xs font-semibold tracking-wider text-sidebar-foreground hover:text-foreground transition-colors w-full">
          <HelpCircle className="w-5 h-5 shrink-0" />
          <span className="hidden lg:block">HELP</span>
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
