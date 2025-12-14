import { useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Activity, Target, Loader2, AlertCircle } from "lucide-react";
import { usePaperTrades } from "@/hooks/usePaperTrades";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface Trade {
  id: string;
  openTime: string;
  closeTime: string | null;
  type: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  status: "open" | "closed";
  isPaper: boolean;
  instrumentType: string | null;
}

const Trades = () => {
  const { user } = useAuth();
  const { trades: paperTrades, isLoading: paperLoading, calculateUnrealizedPL } = usePaperTrades();

  // Fetch real trades
  const { data: realTrades, isLoading: realLoading } = useQuery({
    queryKey: ["real-trades", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_timestamp", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const isLoading = paperLoading || realLoading;

  // Combine and normalize trades
  const allTrades = useMemo((): Trade[] => {
    const normalizedPaper: Trade[] = paperTrades.map((t) => {
      const unrealized = t.status === "OPEN" ? calculateUnrealizedPL(t) : null;
      return {
        id: t.id,
        openTime: t.entry_timestamp,
        closeTime: t.exit_timestamp,
        type: (t.direction === "BUY" || t.instrument_type === "BULL" ? "BUY" : "SELL") as "BUY" | "SELL",
        entryPrice: Number(t.entry_price),
        exitPrice: t.exit_price ? Number(t.exit_price) : null,
        quantity: Number(t.quantity || 1),
        pnl: unrealized ? unrealized.plSek : Number(t.profit_loss_sek || 0),
        pnlPercent: unrealized ? unrealized.plPercent : Number(t.profit_loss_percent || 0),
        status: (t.status === "OPEN" ? "open" : "closed") as "open" | "closed",
        isPaper: true,
        instrumentType: t.instrument_type,
      };
    });

    const normalizedReal: Trade[] = (realTrades || []).map((t) => ({
      id: t.id,
      openTime: t.entry_timestamp,
      closeTime: t.exit_timestamp,
      type: "BUY" as const, // Real trades don't have direction in current schema
      entryPrice: Number(t.entry_price),
      exitPrice: t.exit_price ? Number(t.exit_price) : null,
      quantity: Number(t.quantity),
      pnl: Number(t.profit_loss_sek || 0),
      pnlPercent: Number(t.profit_loss_percent || 0),
      status: (t.status === "OPEN" ? "open" : "closed") as "open" | "closed",
      isPaper: false,
      instrumentType: null,
    }));

    return [...normalizedPaper, ...normalizedReal].sort(
      (a, b) => new Date(b.openTime).getTime() - new Date(a.openTime).getTime()
    );
  }, [paperTrades, realTrades, calculateUnrealizedPL]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const closedTrades = allTrades.filter((t) => t.status === "closed");
    const totalPL = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
    const winningTrades = closedTrades.filter((t) => t.pnl > 0);
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
      : 0;

    return {
      totalPL,
      totalTrades: allTrades.length,
      winRate,
      avgWin,
    };
  }, [allTrades]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Affärer</h1>
          <p className="text-sm text-muted-foreground">Handelslogg och positionshantering</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                summaryStats.totalPL >= 0 ? "bg-primary/10" : "bg-destructive/10"
              )}>
                {summaryStats.totalPL >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-primary" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                )}
              </div>
              <span className="text-sm text-muted-foreground">Total P/L</span>
            </div>
            <p className={cn(
              "text-2xl font-bold font-mono",
              summaryStats.totalPL >= 0 ? "text-primary" : "text-destructive"
            )}>
              {summaryStats.totalPL >= 0 ? "+" : ""}{summaryStats.totalPL.toFixed(0)} SEK
            </p>
          </div>

          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Totalt antal</span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">
              {summaryStats.totalTrades}
            </p>
          </div>

          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Win Rate</span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">
              {summaryStats.winRate.toFixed(1)}%
            </p>
          </div>

          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Snitt vinst</span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">
              {summaryStats.avgWin.toFixed(0)} SEK
            </p>
          </div>
        </div>

        {/* Trades Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Laddar affärer...</span>
            </div>
          ) : allTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
              <span>Inga affärer ännu</span>
              <span className="text-sm">Starta paper trading för att testa strategier</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">
                      Öppnad
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">
                      Typ
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">
                      Entry
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">
                      Exit
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">
                      Antal
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">
                      P/L
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-foreground">
                        {format(new Date(trade.openTime), "yyyy-MM-dd HH:mm", { locale: sv })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-sm font-semibold",
                              trade.type === "BUY" ? "text-primary" : "text-destructive"
                            )}
                          >
                            {trade.type === "BUY" ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {trade.type === "BUY" ? "KÖP" : "SÄLJ"}
                          </span>
                          {trade.instrumentType && (
                            <span className="text-xs text-muted-foreground">{trade.instrumentType}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-foreground">
                        ${trade.entryPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-foreground">
                        {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-muted-foreground">
                        {trade.quantity}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "text-sm font-bold font-mono",
                            trade.pnl >= 0 ? "text-primary" : "text-destructive"
                          )}
                        >
                          {trade.pnl >= 0 ? "+" : ""}
                          {trade.pnl.toFixed(2)} SEK
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex px-2 py-1 rounded-full text-xs font-medium",
                              trade.status === "open"
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {trade.status === "open" ? "Öppen" : "Stängd"}
                          </span>
                          {trade.isPaper && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              Paper
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Trades;
