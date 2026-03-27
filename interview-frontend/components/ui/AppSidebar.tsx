"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound, Video, BarChart3, Settings, HelpCircle, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/Sidebar";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: UserRound, label: "Profile", path: "/profile" },
  { icon: Video, label: "Live Session", path: "/interview/", activePrefix: "/interview/" },
  { icon: BarChart3, label: "Scorecard", path: "/scorecard/OBS-1", activePrefix: "/scorecard/" },
];

const AppSidebar = () => {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/90"
    >
      <div className="border-b border-sidebar-border/70 px-3 py-4 sm:px-4">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden rounded-xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
            IA
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">Intelliview AI</h1>
            <p className="truncate text-[11px] uppercase tracking-[0.22em] text-zinc-500">Interview Workspace</p>
          </div>
        </Link>
      </div>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {sidebarItems.map((item) => {
            const isActive = item.activePrefix
              ? pathname.startsWith(item.activePrefix)
              : pathname === item.path;
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className={cn(
                    "h-11 rounded-xl px-3 text-zinc-500 transition-all duration-200 hover:bg-zinc-900 hover:text-white",
                    "group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:justify-center",
                    isActive && "bg-zinc-900 text-white shadow-sm"
                  )}
                >
                  <Link href={item.path}>
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="font-semibold text-sm tracking-wide">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-sidebar-border/70 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Settings"
              className="h-10 rounded-xl px-3 text-zinc-500 transition-all duration-200 hover:bg-zinc-900 hover:text-white"
            >
              <Link href="/settings">
                <Settings className="w-5 h-5 shrink-0" />
                <span className="font-semibold text-sm tracking-wide">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Help Center"
              className="h-10 rounded-xl px-3 text-zinc-500 transition-all duration-200 hover:bg-zinc-900 hover:text-white"
            >
              <Link href="/help">
                <HelpCircle className="w-5 h-5 shrink-0" />
                <span className="font-semibold text-sm tracking-wide">Help Center</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        <div className="pt-3 group-data-[collapsible=icon]:hidden">
          <button className="w-full py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white transition-all uppercase tracking-widest">
            Upgrade Pro
          </button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
