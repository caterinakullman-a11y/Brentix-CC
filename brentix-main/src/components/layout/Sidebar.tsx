import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Signal,
  TrendingUp,
  BarChart3,
  FileText,
  Settings,
  ChevronRight,
  Droplets,
  History,
  LineChart,
  Zap,
  Scale,
  Shield,
  ClipboardList,
  Database,
  BarChart2,
  TestTube,
  Brain,
  Activity,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Grouped navigation sections
const SIDEBAR_SECTIONS = [
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
      { to: "/history", icon: History, label: "Min historik" },
      { to: "/price-history", icon: BarChart2, label: "Kurshistorik" },
      { to: "/backtest-history", icon: TestTube, label: "Backtest-historik" },
      { to: "/analysis", icon: BarChart3, label: "Analys" },
      { to: "/rules", icon: Zap, label: "Regler" },
    ],
  },
];

const SIDEBAR_FOOTER = [
  { to: "/reports", icon: FileText, label: "Rapporter" },
  { to: "/settings", icon: Settings, label: "Inställningar" },
];

const SIDEBAR_COLLAPSED_KEY = "brentix-sidebar-collapsed";

interface SidebarProps {
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ onCollapsedChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    onCollapsedChange?.(collapsed);
  }, [collapsed, onCollapsedChange]);

  const renderNavItem = (item: { to: string; icon: React.ElementType; label: string }, isEnd?: boolean) => {
    const link = (
      <NavLink
        to={item.to}
        end={isEnd}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            "hover:bg-sidebar-accent",
            collapsed && "justify-center px-2",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )
        }
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        <span className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap",
          collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        )}>{item.label}</span>
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.to} delayDuration={0}>
          <TooltipTrigger asChild>
            {link}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.to}>{link}</div>;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border",
          "transition-[width] duration-300 ease-in-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Droplets className="h-6 w-6 text-primary" />
            </div>
            <div className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            )}>
              <h1 className="text-xl font-bold text-foreground whitespace-nowrap">BRENTIX</h1>
            </div>
          </div>

          {/* Navigation Sections */}
          <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
            {SIDEBAR_SECTIONS.map((section, sectionIndex) => (
              <div key={section.title || sectionIndex} className="mb-4">
                {/* Section Title */}
                {!collapsed && section.title && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                    {section.title}
                  </p>
                )}
                
                {/* Section Items */}
                {section.items.map((item) => renderNavItem(item, item.to === "/"))}
              </div>
            ))}

            {/* Separator */}
            {!collapsed && (
              <div className="my-4 border-t border-sidebar-border" />
            )}
            
            {/* Footer Items */}
            {SIDEBAR_FOOTER.map((item) => renderNavItem(item))}
          </nav>

          {/* Collapse Toggle */}
          <div className="border-t border-sidebar-border p-3">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                >
                  <div className={cn(
                    "transition-transform duration-300 ease-in-out",
                    collapsed ? "rotate-0" : "rotate-180"
                  )}>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                  <span className={cn(
                    "ml-2 text-sm overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap",
                    collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                  )}>Minimera</span>
                </button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" className="font-medium">
                  Expandera meny
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
