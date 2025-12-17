import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Breadcrumbs } from "./Breadcrumbs";
import { MobileDrawer } from "./MobileDrawer";
import { MobileBottomNav } from "./MobileBottomNav";
import { usePriceData } from "@/hooks/usePriceData";

interface MainLayoutProps {
  children: ReactNode;
  onToggleLayoutMode?: () => void;
  isLayoutMode?: boolean;
}

export function MainLayout({ children, onToggleLayoutMode, isLayoutMode }: MainLayoutProps) {
  // Fetch real price data from database
  const { currentPrice, change24h, changePercent24h, isLoading } = usePriceData();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("brentix-sidebar-collapsed");
    return saved === "true";
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - Hidden on mobile */}
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
          onToggleLayoutMode={onToggleLayoutMode}
          isLayoutMode={isLayoutMode}
        />
        <Breadcrumbs />
        <main className="p-4 md:p-6 pb-24 md:pb-6">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
