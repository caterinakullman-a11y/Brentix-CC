import { BacktestSummary } from "@/hooks/useRuleBacktest";
import { TrendingUp, TrendingDown, Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BacktestResultsInlineProps {
  summary: BacktestSummary;
  className?: string;
}

export function BacktestResultsInline({ summary, className }: BacktestResultsInlineProps) {
  const isProfit = summary.totalProfitLoss >= 0;
  const winRateGood = summary.winRate >= 50;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs", className)}>
      {/* Win Rate */}
      <span className="flex items-center gap-1">
        {winRateGood ? (
          <TrendingUp className="h-3 w-3 text-[#5B9A6F]" />
        ) : (
          <TrendingDown className="h-3 w-3 text-[#9A5B5B]" />
        )}
        <span className={winRateGood ? "text-[#5B9A6F]" : "text-[#9A5B5B]"}>
          {summary.winRate.toFixed(1)}% win
        </span>
      </span>

      {/* Total Trades */}
      <span className="flex items-center gap-1 text-muted-foreground">
        <Activity className="h-3 w-3" />
        {summary.totalTrades} trades
      </span>

      {/* Total P/L */}
      <span className={cn(
        "font-mono",
        isProfit ? "text-[#5B9A6F]" : "text-[#9A5B5B]"
      )}>
        {isProfit ? "+" : ""}{summary.totalProfitLoss.toFixed(0)} SEK
        <span className="text-muted-foreground ml-1">
          ({isProfit ? "+" : ""}{summary.totalProfitLossPercent.toFixed(1)}%)
        </span>
      </span>

      {/* Profit Factor */}
      {summary.profitFactor > 0 && (
        <span className="text-muted-foreground">
          PF: {summary.profitFactor > 10 ? ">10" : summary.profitFactor.toFixed(2)}
        </span>
      )}

      {/* Max Drawdown */}
      {summary.maxDrawdownPercent > 5 && (
        <span className="flex items-center gap-1 text-amber-500">
          <AlertTriangle className="h-3 w-3" />
          DD: {summary.maxDrawdownPercent.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
