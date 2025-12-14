import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, subMonths, startOfYear, format, parseISO } from "date-fns";

type DateRange = "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL";

interface Trade {
  id: string;
  entry_timestamp: string;
  exit_timestamp: string | null;
  entry_price: number;
  exit_price: number | null;
  profit_loss_sek: number | null;
  profit_loss_percent: number | null;
  status: string;
}

interface PerformanceStats {
  totalPL: number;
  totalPLPercent: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  bestTrade: { amount: number; percent: number; date: string } | null;
  worstTrade: { amount: number; percent: number; date: string } | null;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
}

interface MonthlyReturn {
  month: string;
  pl: number;
}

interface EquityPoint {
  date: string;
  value: number;
}

function getStartDate(range: DateRange): Date | null {
  const now = new Date();
  switch (range) {
    case "1W":
      return subDays(now, 7);
    case "1M":
      return subMonths(now, 1);
    case "3M":
      return subMonths(now, 3);
    case "YTD":
      return startOfYear(now);
    case "1Y":
      return subMonths(now, 12);
    case "ALL":
      return null;
  }
}

export function usePerformanceData(dateRange: DateRange, initialCapital: number = 10000) {
  const startDate = getStartDate(dateRange);

  const { data, isLoading, error } = useQuery({
    queryKey: ["performance-data", dateRange],
    queryFn: async () => {
      let query = supabase
        .from("trades")
        .select("*")
        .eq("status", "CLOSED")
        .order("exit_timestamp", { ascending: true });

      if (startDate) {
        query = query.gte("exit_timestamp", startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Trade[];
    },
    staleTime: 30000,
  });

  const trades = data ?? [];

  // Calculate stats
  const stats: PerformanceStats = {
    totalPL: 0,
    totalPLPercent: 0,
    winRate: 0,
    totalTrades: trades.length,
    winningTrades: 0,
    losingTrades: 0,
    bestTrade: null,
    worstTrade: null,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    maxDrawdown: 0,
  };

  if (trades.length > 0) {
    let grossProfit = 0;
    let grossLoss = 0;
    let best: Trade | null = null;
    let worst: Trade | null = null;

    trades.forEach((trade) => {
      const pl = trade.profit_loss_sek ?? 0;
      stats.totalPL += pl;

      if (pl > 0) {
        stats.winningTrades++;
        grossProfit += pl;
        if (!best || pl > (best.profit_loss_sek ?? 0)) best = trade;
      } else if (pl < 0) {
        stats.losingTrades++;
        grossLoss += Math.abs(pl);
        if (!worst || pl < (worst.profit_loss_sek ?? 0)) worst = trade;
      }
    });

    stats.winRate = (stats.winningTrades / stats.totalTrades) * 100;
    stats.totalPLPercent = (stats.totalPL / initialCapital) * 100;
    stats.avgWin = stats.winningTrades > 0 ? grossProfit / stats.winningTrades : 0;
    stats.avgLoss = stats.losingTrades > 0 ? grossLoss / stats.losingTrades : 0;
    stats.profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    if (best) {
      stats.bestTrade = {
        amount: best.profit_loss_sek ?? 0,
        percent: best.profit_loss_percent ?? 0,
        date: best.exit_timestamp ?? "",
      };
    }

    if (worst) {
      stats.worstTrade = {
        amount: worst.profit_loss_sek ?? 0,
        percent: worst.profit_loss_percent ?? 0,
        date: worst.exit_timestamp ?? "",
      };
    }

    // Calculate max drawdown
    let peak = initialCapital;
    let maxDD = 0;
    let runningCapital = initialCapital;

    trades.forEach((trade) => {
      runningCapital += trade.profit_loss_sek ?? 0;
      if (runningCapital > peak) peak = runningCapital;
      const drawdown = ((peak - runningCapital) / peak) * 100;
      if (drawdown > maxDD) maxDD = drawdown;
    });

    stats.maxDrawdown = maxDD;
  }

  // Calculate equity curve
  const equityCurve: EquityPoint[] = [];
  let runningValue = initialCapital;

  trades.forEach((trade) => {
    runningValue += trade.profit_loss_sek ?? 0;
    equityCurve.push({
      date: trade.exit_timestamp ? format(parseISO(trade.exit_timestamp), "MMM dd") : "",
      value: runningValue,
    });
  });

  // Add starting point
  if (equityCurve.length > 0) {
    equityCurve.unshift({ date: "Start", value: initialCapital });
  }

  // Calculate monthly returns
  const monthlyMap = new Map<string, number>();
  trades.forEach((trade) => {
    if (trade.exit_timestamp) {
      const month = format(parseISO(trade.exit_timestamp), "MMM yyyy");
      const current = monthlyMap.get(month) ?? 0;
      monthlyMap.set(month, current + (trade.profit_loss_sek ?? 0));
    }
  });

  const monthlyReturns: MonthlyReturn[] = Array.from(monthlyMap.entries()).map(([month, pl]) => ({
    month,
    pl,
  }));

  return {
    stats,
    equityCurve,
    monthlyReturns,
    trades,
    isLoading,
    error: error as Error | null,
  };
}
