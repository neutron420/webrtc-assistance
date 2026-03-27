import AppSidebar from "./AppSidebar";
import TopNav from "./TopNav";
import { SidebarProvider, SidebarInset } from "@/components/Sidebar";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 w-full relative overflow-x-hidden">
          <TopNav />
          <main className="flex-1 w-full pt-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
