import { SidebarInset, SidebarProvider } from "@/components/Sidebar";
import AppSidebar from "./AppSidebar";
import TopNav from "./TopNav";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full overflow-hidden bg-zinc-50/80 text-foreground">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
          <TopNav />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-4 sm:py-5 md:px-6 lg:px-8 lg:py-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
