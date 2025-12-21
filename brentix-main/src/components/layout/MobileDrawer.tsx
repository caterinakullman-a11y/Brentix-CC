import { NavLink, Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Signal,
  TrendingUp,
  BarChart3,
  FileText,
  Settings,
  Droplets,
  History,
  LineChart,
  X,
  Menu,
  LogOut,
  Shield,
  Scale,
  ClipboardList,
  Database,
  BarChart2,
  TestTube,
  Brain,
  Activity,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

// Grouped navigation sections - same as Sidebar
const MOBILE_NAV_SECTIONS = [
  {
    title: null,
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/signals", icon: Signal, label: "Signaler" },
    ],
  },
  {
    title: "HANDEL",
    items: [
      { to: "/trades", icon: TrendingUp, label: "Trades" },
      { to: "/paper-history", icon: ClipboardList, label: "Paper Trades" },
      { to: "/safety", icon: Shield, label: "Säkerhet" },
      { to: "/pairs", icon: Scale, label: "BULL/BEAR" },
    ],
  },
  {
    title: "PRISANALYS",
    items: [
      { to: "/prisanalys", icon: Activity, label: "Dashboard" },
      { to: "/prisanalys/historik", icon: Database, label: "Historik" },
      { to: "/prisanalys/statistik", icon: BarChart2, label: "Statistik" },
      { to: "/prisanalys/regler", icon: Zap, label: "Regler" },
      { to: "/prisanalys/backtest", icon: TestTube, label: "Backtest" },
      { to: "/prisanalys/ai", icon: Brain, label: "AI-Förslag" },
    ],
  },
  {
    title: "ANALYS",
    items: [
      { to: "/performance", icon: LineChart, label: "Prestanda" },
      { to: "/history", icon: History, label: "Historik" },
      { to: "/analysis", icon: BarChart3, label: "Analys" },
      { to: "/rules", icon: Zap, label: "Regler" },
    ],
  },
];

const MOBILE_NAV_FOOTER = [
  { to: "/reports", icon: FileText, label: "Rapporter" },
  { to: "/settings", icon: Settings, label: "Inställningar" },
];

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    onClose();
    await signOut();
    navigate("/login", { replace: true });
  };

  const renderNavItem = (item: { to: string; icon: React.ElementType; label: string }, isEnd?: boolean) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={isEnd}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors min-h-[48px]",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  );

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-[280px] bg-background border-r border-border transition-transform duration-300 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigeringsmeny"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <Link to="/" onClick={onClose} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Droplets className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-bold text-foreground">BRENTIX</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9"
              aria-label="Stäng meny"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation - Grouped */}
          <nav className="flex-1 overflow-y-auto p-4" aria-label="Huvudnavigering">
            {MOBILE_NAV_SECTIONS.map((section, sectionIndex) => (
              <div key={section.title || sectionIndex} className="mb-4">
                {/* Section Title */}
                {section.title && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 py-2">
                    {section.title}
                  </p>
                )}

                {/* Section Items */}
                {section.items.map((item) => renderNavItem(item, item.to === "/" || item.to === "/prisanalys"))}
              </div>
            ))}

            {/* Separator */}
            <div className="my-4 border-t border-border" />

            {/* Footer Items */}
            {MOBILE_NAV_FOOTER.map((item) => renderNavItem(item))}

            {/* Admin Link */}
            {isAdmin && (
              <>
                <div className="my-4 border-t border-border" />
                <NavLink
                  to="/admin"
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors min-h-[48px]",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                    )
                  }
                >
                  <Shield className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span>Admin</span>
                </NavLink>
              </>
            )}
          </nav>

          {/* Footer with Logout */}
          <div className="border-t border-border p-4 space-y-3 pb-safe">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 min-h-[48px]"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span>Logga ut</span>
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Brent Crude Oil Analytics
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="h-10 w-10 md:hidden"
      aria-label="Öppna meny"
    >
      <Menu className="h-5 w-5" aria-hidden="true" />
    </Button>
  );
}
