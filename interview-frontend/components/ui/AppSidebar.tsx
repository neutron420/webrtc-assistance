"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headphones, Video, BarChart3, Settings, HelpCircle, LayoutDashboard, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/Sidebar";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Headphones, label: "Preparation", path: "/" },
  { icon: Video, label: "Live Session", path: "/live" },
  { icon: BarChart3, label: "Analytics", path: "/scorecards" },
];

const AppSidebar = () => {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-zinc-950 text-white">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-sm tracking-tight text-white">Obsidian AI</span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Premium Tier</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 mt-4">
        <SidebarMenu>
          {sidebarItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className={cn(
                    "text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200",
                    isActive && "text-white bg-zinc-900"
                  )}
                >
                  <Link href={item.path}>
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span className="font-semibold text-xs tracking-wide">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200"
            >
              <Link href="/settings">
                <Settings className="w-5 h-5 shrink-0" />
                <span className="font-semibold text-xs tracking-wide group-data-[collapsible=icon]:hidden">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all duration-200"
            >
              <Link href="/help">
                <HelpCircle className="w-5 h-5 shrink-0" />
                <span className="font-semibold text-xs tracking-wide group-data-[collapsible=icon]:hidden">Help Center</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        <div className="pt-4 group-data-[collapsible=icon]:hidden">
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
