import AppSidebar from "./AppSidebar";
import TopNav from "./TopNav";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <TopNav />
      <main className="ml-16 lg:ml-56 pt-14 min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
