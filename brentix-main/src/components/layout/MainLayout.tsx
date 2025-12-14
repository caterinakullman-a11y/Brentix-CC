import { ReactNode, useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Breadcrumbs } from "./Breadcrumbs";
import { MobileDrawer } from "./MobileDrawer";
import { MobileBottomNav } from "./MobileBottomNav";

interface MainLayoutProps {
  children: ReactNode;
  onToggleLayoutMode?: () => void;
  isLayoutMode?: boolean;
}

export function MainLayout({ children, onToggleLayoutMode, isLayoutMode }: MainLayoutProps) {
  const [priceData, setPriceData] = useState({
    currentPrice: 75.48,
    priceChange: 0.28,
    priceChangePercent: 0.37,
    lastUpdated: "Just now",
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("brentix-sidebar-collapsed");
    return saved === "true";
  });

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      const change = (Math.random() - 0.5) * 0.2;
      setPriceData((prev) => {
        const newPrice = prev.currentPrice + change;
        return {
          currentPrice: Math.round(newPrice * 100) / 100,
          priceChange: Math.round(change * 100) / 100,
          priceChangePercent: Math.round((change / prev.currentPrice) * 100 * 100) / 100,
          lastUpdated: "Just now",
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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
          {...priceData} 
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
