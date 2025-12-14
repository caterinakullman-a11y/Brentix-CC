import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceCardProps {
  currentPrice: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  isLoading?: boolean;
}

export function PriceCard({
  currentPrice = 0,
  change24h = 0,
  changePercent24h = 0,
  high24h = 0,
  low24h = 0,
  volume = 0,
  isLoading = false,
}: PriceCardProps) {
  const isPositive = change24h >= 0;
  const hasData = currentPrice > 0;

  const formatValue = (value: number, prefix = "$") => {
    if (!hasData && !isLoading) return "--";
    return `${prefix}${value.toFixed(2)}`;
  };

  return (
    <div className={cn("glass-card rounded-2xl p-4 md:p-6 animate-slide-up", isLoading && "animate-pulse opacity-70")}>
      <div className="flex items-start justify-between mb-4 md:mb-6 gap-2">
        <div>
          <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Brent Crude Oil
          </p>
          <div className="flex items-baseline gap-2 md:gap-3">
            <span className="text-3xl md:text-5xl font-bold font-mono text-foreground">
              {hasData ? `$${currentPrice.toFixed(2)}` : "--"}
            </span>
            <span className="text-sm md:text-lg text-muted-foreground">USD/bbl</span>
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 md:gap-2 rounded-lg md:rounded-xl px-2 md:px-4 py-1 md:py-2",
            isPositive ? "bg-primary/10 glow-bullish" : "bg-destructive/10 glow-bearish"
          )}
        >
          {isPositive ? (
            <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          ) : (
            <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
          )}
          <div className="text-right">
            <p
              className={cn(
                "text-sm md:text-lg font-bold font-mono",
                isPositive ? "text-primary" : "text-destructive"
              )}
            >
              {hasData ? `${isPositive ? "+" : ""}${change24h.toFixed(2)}` : "--"}
            </p>
            <p
              className={cn(
                "text-[10px] md:text-xs",
                isPositive ? "text-primary/80" : "text-destructive/80"
              )}
            >
              {hasData ? `(${isPositive ? "+" : ""}${changePercent24h.toFixed(2)}%)` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="rounded-lg md:rounded-xl bg-muted/50 p-3 md:p-4">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-primary" />
            <span className="text-[10px] md:text-xs text-muted-foreground uppercase">High</span>
          </div>
          <p className="text-base md:text-xl font-bold font-mono text-foreground">
            {formatValue(high24h)}
          </p>
        </div>
        <div className="rounded-lg md:rounded-xl bg-muted/50 p-3 md:p-4">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
            <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-destructive" />
            <span className="text-[10px] md:text-xs text-muted-foreground uppercase">Low</span>
          </div>
          <p className="text-base md:text-xl font-bold font-mono text-foreground">
            {formatValue(low24h)}
          </p>
        </div>
        <div className="rounded-lg md:rounded-xl bg-muted/50 p-3 md:p-4">
          <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
            <BarChart2 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            <span className="text-[10px] md:text-xs text-muted-foreground uppercase">Volume</span>
          </div>
          <p className="text-base md:text-xl font-bold font-mono text-foreground">
            {hasData ? `${(volume / 1000).toFixed(1)}K` : "--"}
          </p>
        </div>
      </div>
    </div>
  );
}
