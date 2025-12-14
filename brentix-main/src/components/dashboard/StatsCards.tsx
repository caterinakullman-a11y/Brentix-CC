import { TrendingUp, Briefcase, Activity, Target, Signal } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  isLoading?: boolean;
}

function StatCard({ title, value, subValue, icon, trend, trendValue, isLoading }: StatCardProps) {
  return (
    <div className={cn("glass-card rounded-xl p-3 md:p-4 flex items-center gap-3 md:gap-4 min-h-[72px]", isLoading && "animate-pulse opacity-70")}>
      <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg md:rounded-xl bg-muted flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
        <div className="flex items-baseline gap-1 md:gap-2">
          <span className="text-lg md:text-2xl font-bold font-mono text-foreground">{value}</span>
          {subValue && <span className="text-xs md:text-sm text-muted-foreground truncate">{subValue}</span>}
        </div>
        {trend && trendValue && (
          <p
            className={cn(
              "text-[10px] md:text-xs font-medium truncate",
              trend === "up" ? "text-primary" : trend === "down" ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
          </p>
        )}
      </div>
    </div>
  );
}

interface StatsCardsProps {
  dailyPL: number;
  dailyPLPercent: number;
  openPositions: number;
  totalExposure: number;
  todayTrades: number;
  winners: number;
  losers: number;
  winRate: number;
  activeSignals: number;
  isLoading?: boolean;
}

export function StatsCards({
  dailyPL = 0,
  dailyPLPercent = 0,
  openPositions = 0,
  totalExposure = 0,
  todayTrades = 0,
  winners = 0,
  losers = 0,
  winRate = 0,
  activeSignals = 0,
  isLoading = false,
}: StatsCardsProps) {
  const plPositive = dailyPL >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 animate-slide-up" style={{ animationDelay: "0.4s" }}>
      <StatCard
        title="Today's P/L"
        value={dailyPL !== 0 ? `${plPositive ? "+" : ""}${dailyPL.toLocaleString()}` : "--"}
        subValue={dailyPL !== 0 ? "SEK" : undefined}
        icon={
          <TrendingUp
            className={cn("h-5 w-5", plPositive ? "text-primary" : "text-destructive")}
          />
        }
        trend={dailyPL !== 0 ? (plPositive ? "up" : "down") : undefined}
        trendValue={dailyPL !== 0 ? `${plPositive ? "+" : ""}${dailyPLPercent.toFixed(1)}%` : undefined}
        isLoading={isLoading}
      />

      <StatCard
        title="Open Positions"
        value={openPositions}
        subValue={totalExposure > 0 ? `${(totalExposure / 1000).toFixed(0)}K SEK` : undefined}
        icon={<Briefcase className="h-5 w-5 text-muted-foreground" />}
        isLoading={isLoading}
      />

      <StatCard
        title="Today's Trades"
        value={todayTrades}
        subValue={todayTrades > 0 ? `${winners}W / ${losers}L` : undefined}
        icon={<Activity className="h-5 w-5 text-muted-foreground" />}
        isLoading={isLoading}
      />

      <StatCard
        title="Win Rate"
        value={winRate > 0 ? `${winRate.toFixed(1)}%` : "--"}
        icon={
          <Target
            className={cn(
              "h-5 w-5",
              winRate >= 60 ? "text-primary" : winRate >= 50 ? "text-warning" : "text-muted-foreground"
            )}
          />
        }
        trend={winRate > 0 ? (winRate >= 50 ? "up" : "down") : undefined}
        trendValue={winRate > 0 ? (winRate >= 60 ? "Good" : winRate >= 50 ? "Average" : "Needs improvement") : undefined}
        isLoading={isLoading}
      />

      <StatCard
        title="Active Signals"
        value={activeSignals}
        icon={<Signal className="h-5 w-5 text-primary" />}
        isLoading={isLoading}
      />
    </div>
  );
}
