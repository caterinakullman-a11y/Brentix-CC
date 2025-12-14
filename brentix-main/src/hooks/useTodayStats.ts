import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Trade {
  id: string;
  entry_timestamp: string;
  entry_price: number;
  exit_price: number | null;
  profit_loss_sek: number | null;
  profit_loss_percent: number | null;
  status: "OPEN" | "CLOSED" | "CANCELLED";
}

interface TodayStatsResult {
  todayTrades: number;
  winners: number;
  losers: number;
  dailyPL: number;
  dailyPLPercent: number;
  openPositions: number;
  totalExposure: number;
  winRate: number;
  isLoading: boolean;
  error: Error | null;
}

export function useTodayStats(): TodayStatsResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["today-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      // Fetch today's trades
      const { data: trades, error: tradesError } = await supabase
        .from("trades")
        .select("*")
        .gte("entry_timestamp", todayIso);

      if (tradesError) throw tradesError;

      // Fetch open positions
      const { data: openTrades, error: openError } = await supabase
        .from("trades")
        .select("*")
        .eq("status", "OPEN");

      if (openError) throw openError;

      return { trades: trades as Trade[], openTrades: openTrades as Trade[] };
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const trades = data?.trades ?? [];
  const openTrades = data?.openTrades ?? [];

  const closedTrades = trades.filter((t) => t.status === "CLOSED");
  const winners = closedTrades.filter((t) => (t.profit_loss_sek ?? 0) > 0).length;
  const losers = closedTrades.filter((t) => (t.profit_loss_sek ?? 0) < 0).length;
  const dailyPL = closedTrades.reduce((sum, t) => sum + (t.profit_loss_sek ?? 0), 0);
  const totalTrades = closedTrades.length;
  const winRate = totalTrades > 0 ? (winners / totalTrades) * 100 : 0;
  const totalExposure = openTrades.reduce((sum, t) => sum + (t.entry_price * 100), 0); // Rough estimate

  return {
    todayTrades: trades.length,
    winners,
    losers,
    dailyPL,
    dailyPLPercent: 0, // Would need capital data for accurate calculation
    openPositions: openTrades.length,
    totalExposure,
    winRate,
    isLoading,
    error: error as Error | null,
  };
}
