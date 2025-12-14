import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useUserSettings } from "@/hooks/useUserSettings";
import { usePriceData } from "@/hooks/usePriceData";

export interface PaperTrade {
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
  direction: string | null;
  instrument_type: string | null;
  amount_sek: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function usePaperTrades() {
  const { user } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  const { currentPrice } = usePriceData();
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const fetchTrades = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("paper_trades")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_timestamp", { ascending: false });

      if (error) throw error;
      setTrades(data || []);
    } catch (err) {
      console.error("Error fetching paper trades:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Get only open trades
  const openTrades = trades.filter(t => t.status === "OPEN");
  const closedTrades = trades.filter(t => t.status === "CLOSED");

  // Close a position
  const closePosition = useCallback(async (tradeId: string, exitPrice?: number) => {
    if (!user || !settings) return;

    setIsClosing(true);
    
    try {
      const trade = trades.find(t => t.id === tradeId);
      if (!trade) throw new Error("Trade not found");

      const price = exitPrice ?? currentPrice ?? trade.entry_price;
      
      // Calculate P/L based on direction
      let profitLossSek: number;
      let profitLossPercent: number;
      
      if (trade.direction === "BUY" || trade.instrument_type === "BULL") {
        // Long position: profit when price goes up
        profitLossPercent = ((price - trade.entry_price) / trade.entry_price) * 100;
      } else {
        // Short position (BEAR): profit when price goes down
        profitLossPercent = ((trade.entry_price - price) / trade.entry_price) * 100;
      }
      
      profitLossSek = (trade.position_value_sek * profitLossPercent) / 100;

      // Update the trade
      const { error: updateError } = await supabase
        .from("paper_trades")
        .update({
          exit_price: price,
          exit_timestamp: new Date().toISOString(),
          profit_loss_sek: profitLossSek,
          profit_loss_percent: profitLossPercent,
          status: "CLOSED",
        })
        .eq("id", tradeId);

      if (updateError) throw updateError;

      // Update paper balance
      const newBalance = (settings.paper_balance || 0) + trade.position_value_sek + profitLossSek;
      await updateSettings({ paper_balance: newBalance });

      // Refresh trades
      await fetchTrades();
    } catch (err) {
      console.error("Error closing position:", err);
      setError(err as Error);
      throw err;
    } finally {
      setIsClosing(false);
    }
  }, [user, settings, trades, currentPrice, updateSettings, fetchTrades]);

  // Calculate unrealized P/L for open trades
  const calculateUnrealizedPL = useCallback((trade: PaperTrade) => {
    if (!currentPrice) return { plSek: 0, plPercent: 0 };
    
    let plPercent: number;
    if (trade.direction === "BUY" || trade.instrument_type === "BULL") {
      plPercent = ((currentPrice - trade.entry_price) / trade.entry_price) * 100;
    } else {
      plPercent = ((trade.entry_price - currentPrice) / trade.entry_price) * 100;
    }
    
    const plSek = (trade.position_value_sek * plPercent) / 100;
    return { plSek, plPercent };
  }, [currentPrice]);

  return { 
    trades, 
    openTrades,
    closedTrades,
    isLoading, 
    error,
    isClosing,
    closePosition,
    calculateUnrealizedPL,
    refetch: fetchTrades,
  };
}
