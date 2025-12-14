import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, LogOut, RefreshCw, Shield, Sun, Moon, Fuel, ChevronDown, User, Settings2, AlertTriangle } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRealtimeSubscriptions } from "@/hooks/useRealtimeSubscriptions";
import { toast } from "@/hooks/use-toast";
import { useAutoTrading } from "@/hooks/useAutoTrading";
import { AutoTradingConfirmModal } from "@/components/AutoTradingConfirmModal";
import { NotificationBell } from "@/components/NotificationBell";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useStorageStatus } from "@/hooks/useStorageStatus";
import { MobileMenuButton } from "./MobileDrawer";

interface HeaderProps {
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  lastUpdated: string;
  onMenuClick?: () => void;
  onToggleLayoutMode?: () => void;
  isLayoutMode?: boolean;
}

const SESSION_CONFIRMED_KEY = "autoTrading_confirmed";

export function Header({
  currentPrice = 75.48,
  priceChange = 0.28,
  priceChangePercent = 0.37,
  lastUpdated = "Just now",
  onMenuClick,
  onToggleLayoutMode,
  isLayoutMode,
}: HeaderProps) {
  const isPositive = priceChange >= 0;
  const { signOut, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const { triggerPriceFetch } = useRealtimeSubscriptions();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [priceFlash, setPriceFlash] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  
  const { isEnabled: autoTrading, toggle: toggleAutoTrading, isLoading: autoLoading } = useAutoTrading();
  const { settings, updateSettings } = useUserSettings();
  const isPaperTrading = settings?.paper_trading_enabled ?? true;
  const { status: storageStatus } = useStorageStatus();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await triggerPriceFetch();
      setPriceFlash(true);
      setTimeout(() => setPriceFlash(false), 300);
      toast({
        title: "Price Updated",
        description: "Latest price data fetched successfully",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch price data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAutoTradingToggle = () => {
    if (autoLoading) return;
    
    if (autoTrading) {
      toggleAutoTrading();
      return;
    }
    
    const hasConfirmed = sessionStorage.getItem(SESSION_CONFIRMED_KEY);
    if (hasConfirmed) {
      toggleAutoTrading();
    } else {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmAutoTrading = () => {
    sessionStorage.setItem(SESSION_CONFIRMED_KEY, "true");
    toggleAutoTrading();
    setShowConfirmModal(false);
  };

  const handleTradingModeChange = (mode: "paper" | "live") => {
    if (mode === "paper" && !isPaperTrading) {
      updateSettings({ paper_trading_enabled: true });
    } else if (mode === "live" && isPaperTrading) {
      // This will trigger the confirmation in TradingModeCard
      updateSettings({ paper_trading_enabled: false });
    }
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur-lg px-3 md:px-6">
        {/* Left side - Price display (compact) */}
        <div className="flex items-center gap-3 md:gap-6">
          {/* Mobile Menu Button */}
          {onMenuClick && <MobileMenuButton onClick={onMenuClick} />}

          {/* Price Display - Compact with Tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 md:gap-3 cursor-help">
                  <div className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Fuel className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xl md:text-2xl font-bold font-mono text-foreground transition-colors duration-300",
                        priceFlash && (isPositive ? "text-primary" : "text-destructive")
                      )}
                    >
                      ${currentPrice.toFixed(2)}
                    </span>
                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                        isPositive
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span className="font-mono">
                        {isPositive ? "+" : ""}{priceChangePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-center">
                <p className="font-semibold">Brent Crude Oil</p>
                <p className="text-xs text-muted-foreground">
                  ${currentPrice.toFixed(2)} ({isPositive ? "+" : ""}{priceChange.toFixed(2)} / {isPositive ? "+" : ""}{priceChangePercent.toFixed(2)}%)
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

        </div>

        {/* Right side - Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8"
            title="Uppdatera pris"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>

          {/* Layout Mode Button */}
          {onToggleLayoutMode && (
            <Button
              variant={isLayoutMode ? "secondary" : "ghost"}
              size="icon"
              onClick={onToggleLayoutMode}
              className="h-8 w-8"
              title="Anpassa layout"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
          {/* Trading Mode Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 h-8 text-xs"
                data-tour="paper-badge"
              >
                {isPaperTrading ? "📝 Paper" : "💰 Live"}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border">
              <DropdownMenuItem 
                onClick={() => handleTradingModeChange("paper")}
                className={cn(isPaperTrading && "bg-primary/10")}
              >
                📝 Paper Trading
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleTradingModeChange("live")}
                className={cn(!isPaperTrading && "bg-primary/10")}
              >
                💰 Live Trading
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Auto Trading Toggle - Compact */}
          <div 
            data-tour="auto-toggle" 
            className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full border border-border bg-background"
          >
            <span className="text-xs text-muted-foreground hidden sm:inline">Auto</span>
            <Switch 
              checked={autoTrading} 
              onCheckedChange={handleAutoTradingToggle}
              disabled={autoLoading}
              className="h-4 w-7 data-[state=checked]:bg-primary"
            />
            {autoTrading && (
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </div>

          <div className="hidden md:block w-px h-4 bg-border" />

          {/* Storage Warning */}
          {storageStatus?.isWarning && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/settings")}
                    className={cn(
                      "h-8 w-8",
                      storageStatus.isCritical 
                        ? "text-destructive animate-pulse" 
                        : "text-amber-500"
                    )}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">
                    {storageStatus.isCritical ? "🚨 Kritiskt lagringsutrymme" : "⚠️ Hög lagringsanvändning"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {storageStatus.usedPercent.toFixed(1)}% använt - Klicka för åtgärd
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Notification Bell */}
          <NotificationBell />

          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {userInitials}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2">
                    <Shield className="h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2">
                <User className="h-4 w-4" />
                Inställningar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive">
                <LogOut className="h-4 w-4" />
                Logga ut
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AutoTradingConfirmModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmAutoTrading}
        onCancel={() => setShowConfirmModal(false)}
      />
    </>
  );
}
