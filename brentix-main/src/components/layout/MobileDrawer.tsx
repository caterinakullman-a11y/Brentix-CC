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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/signals", icon: Signal, label: "Signals" },
  { to: "/trades", icon: TrendingUp, label: "Trades" },
  { to: "/history", icon: History, label: "History" },
  { to: "/performance", icon: LineChart, label: "Performance" },
  { to: "/analysis", icon: BarChart3, label: "Analysis" },
  { to: "/reports", icon: FileText, label: "Reports" },
  { to: "/settings", icon: Settings, label: "Settings" },
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

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 bg-background border-r border-border transition-transform duration-300 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
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
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
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
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}

            {/* Admin Link */}
            {isAdmin && (
              <NavLink
                to="/admin"
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
                <Shield className="h-5 w-5 flex-shrink-0" />
                <span>Admin</span>
              </NavLink>
            )}
          </nav>

          {/* Footer with Logout */}
          <div className="border-t border-border p-4 space-y-3">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
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
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
