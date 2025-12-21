import { useState, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Breadcrumbs } from "./Breadcrumbs";
import { MobileDrawer } from "./MobileDrawer";
import { MobileBottomNav } from "./MobileBottomNav";
import { usePriceData } from "@/hooks/usePriceData";
import { Skeleton } from "@/components/ui/skeleton";

// Content loading fallback - shows skeleton in content area only
const ContentLoader = () => (
  <div className="space-y-4 p-4 md:p-6 animate-pulse">
    <Skeleton className="h-8 w-1/3" />
    <Skeleton className="h-4 w-1/2" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
    <Skeleton className="h-64 mt-4" />
  </div>
);

export function AuthenticatedLayout() {
  const { currentPrice, change24h, changePercent24h, isLoading } = usePriceData();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("brentix-sidebar-collapsed");
    return saved === "true";
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - Hidden on mobile - NEVER re-renders on navigation */}
      <div className="hidden md:block">
        <Sidebar onCollapsedChange={setSidebarCollapsed} />
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content - Dynamic padding based on sidebar state */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'}`}>
        <Header
          currentPrice={currentPrice}
          priceChange={change24h}
          priceChangePercent={changePercent24h}
          lastUpdated={isLoading ? "Laddar..." : "Live"}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <Breadcrumbs />
        <main className="pb-24 md:pb-6">
          <Suspense fallback={<ContentLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
