import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

type FilterStatus = "all" | "OPEN" | "CLOSED";
type TradeMode = "real" | "paper";

interface Trade {
  id: string;
  entry_timestamp: string;
  entry_price: number;
  exit_timestamp: string | null;
  exit_price: number | null;
  profit_loss_sek: number | null;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  signal_id: string | null;
}

interface PaperTrade {
  id: string;
  user_id: string;
  signal_id: string | null;
  entry_timestamp: string;
  exit_timestamp: string | null;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  position_value_sek: number;
  profit_loss_sek: number | null;
  profit_loss_percent: number | null;
  status: string;
}

const ITEMS_PER_PAGE = 20;

const History = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [page, setPage] = useState(0);
  const [tradeMode, setTradeMode] = useState<TradeMode>("real");

  const { data: realData, isLoading: realLoading } = useQuery({
    queryKey: ["trade-history", filter, page],
    queryFn: async () => {
      let query = supabase
        .from("trades")
        .select("*", { count: "exact" })
        .order("entry_timestamp", { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { trades: data as Trade[], count: count ?? 0 };
    },
    enabled: tradeMode === "real",
  });

  const { data: paperData, isLoading: paperLoading } = useQuery({
    queryKey: ["paper-trade-history", filter, page, user?.id],
    queryFn: async () => {
      if (!user) return { trades: [], count: 0 };
      
      let query = supabase
        .from("paper_trades")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("entry_timestamp", { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { trades: data as PaperTrade[], count: count ?? 0 };
    },
    enabled: tradeMode === "paper",
  });

  const isLoading = tradeMode === "real" ? realLoading : paperLoading;
  const trades = tradeMode === "real" ? (realData?.trades ?? []) : (paperData?.trades ?? []);
  const totalCount = tradeMode === "real" ? (realData?.count ?? 0) : (paperData?.count ?? 0);
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTradeType = (): "BUY" | "SELL" => {
    return "BUY";
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trade History</h1>
          <p className="text-sm text-muted-foreground">
            View and analyze your past trades
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 pb-2 border-b border-border">
          <button
            onClick={() => {
              setTradeMode("real");
              setPage(0);
            }}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              tradeMode === "real"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Real Trades
          </button>
          <button
            onClick={() => {
              setTradeMode("paper");
              setPage(0);
            }}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
              tradeMode === "paper"
                ? "bg-amber-500/10 text-amber-500"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Paper Trades
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[9px]">
              SIM
            </Badge>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-6">
          {(["all", "OPEN", "CLOSED"] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilter(status);
                setPage(0);
              }}
              className={cn(
                "text-sm font-medium pb-2 transition-colors",
                filter === status
                  ? "border-b-2"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={{
                borderColor: filter === status ? (tradeMode === "paper" ? "#f59e0b" : "#5B9A6F") : "transparent",
                color: filter === status ? (tradeMode === "paper" ? "#f59e0b" : "#5B9A6F") : undefined,
              }}
            >
              {status === "all" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="w-full">
          {/* Header */}
          <div
            className="grid grid-cols-6 gap-4 pb-3 text-[10px] text-muted-foreground uppercase tracking-wider"
          >
            <div>Date/Time</div>
            <div>Type</div>
            <div>Entry</div>
            <div>Exit</div>
            <div>P/L</div>
            <div>Status</div>
          </div>

          {/* Body */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded animate-pulse bg-muted"
                />
              ))}
            </div>
          ) : trades.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              {tradeMode === "paper" 
                ? "No paper trades yet. Enable paper trading to simulate trades."
                : "No trades yet"}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {trades.map((trade) => {
                const type = getTradeType();
                const isProfit = (trade.profit_loss_sek ?? 0) > 0;
                
                return (
                  <div
                    key={trade.id}
                    className={cn(
                      "grid grid-cols-6 gap-4 py-3 transition-colors hover:bg-muted/50 text-sm",
                      tradeMode === "paper" && "border-l-2 border-amber-500/30 pl-3"
                    )}
                  >
                    <div className="font-mono text-muted-foreground">
                      {formatDateTime(trade.entry_timestamp)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium bg-muted"
                        style={{
                          color: type === "BUY" ? "#5B9A6F" : "#9A5B5B",
                        }}
                      >
                        {type}
                      </span>
                      {tradeMode === "paper" && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[8px] px-1">
                          SIM
                        </Badge>
                      )}
                    </div>
                    <div className="font-mono text-foreground">
                      ${Number(trade.entry_price).toFixed(2)}
                    </div>
                    <div className="font-mono text-foreground">
                      {trade.exit_price ? `$${Number(trade.exit_price).toFixed(2)}` : "--"}
                    </div>
                    <div
                      className="font-mono"
                      style={{
                        color: trade.profit_loss_sek
                          ? isProfit
                            ? "#5B9A6F"
                            : "#9A5B5B"
                          : undefined,
                      }}
                    >
                      {trade.profit_loss_sek
                        ? `${isProfit ? "+" : ""}${Number(trade.profit_loss_sek).toFixed(0)} SEK`
                        : "--"}
                    </div>
                    <div className="text-muted-foreground">
                      {trade.status}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalCount > ITEMS_PER_PAGE && (
          <div className="flex justify-center gap-4 pt-4 text-sm">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={!hasPrev}
              className={cn(
                "transition-colors",
                hasPrev ? "text-primary hover:text-foreground" : "text-muted-foreground cursor-not-allowed"
              )}
            >
              ← Previous
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext}
              className={cn(
                "transition-colors",
                hasNext ? "text-primary hover:text-foreground" : "text-muted-foreground cursor-not-allowed"
              )}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default History;
