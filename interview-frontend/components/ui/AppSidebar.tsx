"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headphones, Video, BarChart3, Settings, HelpCircle, LayoutDashboard, Zap } from "lucide-react";
import { Logo } from "@/components/hero-section-1";
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/Sidebar";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Headphones, label: "Preparation", path: "/" },
  { icon: Video, label: "Live Session", path: "/live" },
  { icon: BarChart3, label: "Analytics", path: "/scorecards" },
];

export default function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/" className="flex items-center gap-2 pl-1">
                  <Logo className="h-6 w-auto" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.path}>
                        <item.icon />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarGroup>
            <SidebarGroupContent>
                <div className="p-2 mb-2 group-data-[collapsible=icon]:hidden">
                    <div className="bg-primary/10 rounded-xl p-3 border border-primary/20 text-center flex flex-col items-center">
                        <Zap className="w-5 h-5 text-primary mb-1" />
                        <span className="text-[10px] uppercase font-bold text-foreground">Upgrade Pro</span>
                        <span className="text-[10px] text-muted-foreground mt-1">Unlock FAANG mock reps</span>
                    </div>
                </div>
                <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Settings" asChild>
                    <Link href="/settings">
                        <Settings />
                        <span>Settings</span>
                    </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Help Center" asChild>
                    <Link href="/help">
                        <HelpCircle />
                        <span>Help Center</span>
                    </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
