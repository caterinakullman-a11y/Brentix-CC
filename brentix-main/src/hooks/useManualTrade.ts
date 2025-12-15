import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserSettings } from "./useUserSettings";
import { usePriceData } from "./usePriceData";
import { toast } from "@/hooks/use-toast";
import { DEFAULT_BULL_ID, DEFAULT_BEAR_ID } from "@/constants/instruments";

export type TradeDirection = "BUY" | "SELL";
export type InstrumentType = "BULL" | "BEAR";

export interface ManualTradeParams {
  direction: TradeDirection;
  instrumentType: InstrumentType;
  amountSEK: number;
  price: number;
  notes?: string;
}

export interface TradeResult {
  success: boolean;
  orderId?: string;
  message: string;
  isPaperTrade: boolean;
}

export function useManualTrade() {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { currentPrice } = usePriceData();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const isPaperTrading = settings?.paper_trading_enabled ?? true;

  // Fetch active trading rules for snapshot
  const { data: activeRules } = useQuery({
    queryKey: ["active-trading-rules", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_rules")
        .select("id, name, conditions")
        .eq("user_id", user?.id)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Get instrument ID based on type (uses user's preferred instruments)
  const getInstrumentId = (type: InstrumentType): string => {
    if (type === "BULL") {
      return settings?.preferred_bull_id || DEFAULT_BULL_ID;
    }
    return settings?.preferred_bear_id || DEFAULT_BEAR_ID;
  };

  // Create trade rule snapshot
  const createRuleSnapshot = async (tradeId: string, tradeType: "paper" | "live") => {
    if (!activeRules || activeRules.length === 0) return;
    
    try {
      await supabase.from("trade_rule_snapshot").insert({
        trade_id: tradeId,
        trade_type: tradeType,
        active_rule_ids: activeRules.map(r => r.id),
        rule_names: activeRules.map(r => r.name),
        rule_conditions: activeRules.map(r => ({
          id: r.id,
          name: r.name,
          conditions: r.conditions,
        })),
        triggered_rule_ids: [],
      });
    } catch (err) {
      console.error("Failed to create rule snapshot:", err);
    }
  };

  // Execute paper trade (simulated)
  const executePaperTrade = async (params: ManualTradeParams): Promise<TradeResult> => {
    const { direction, instrumentType, amountSEK, price, notes } = params;
    
    // Calculate quantity based on amount and price
    const quantity = Math.floor(amountSEK / price);
    
    if (quantity < 1) {
      throw new Error(`Beloppet är för litet. Minst ${price.toFixed(2)} SEK krävs för 1 enhet.`);
    }

    // Check paper balance
    const currentBalance = Number(settings?.paper_balance) || 100000;
    if (direction === "BUY" && amountSEK > currentBalance) {
      throw new Error(`Otillräckligt paper trading-saldo. Du har ${currentBalance.toFixed(0)} SEK.`);
    }

    // Insert paper trade record
    const { data: trade, error } = await supabase
      .from("paper_trades")
      .insert({
        user_id: user?.id,
        instrument_type: instrumentType,
        direction,
        entry_price: price,
        entry_timestamp: new Date().toISOString(),
        quantity,
        amount_sek: amountSEK,
        position_value_sek: amountSEK,
        status: "OPEN",
        notes: notes || `Manuell ${direction} ${instrumentType}`,
      })
      .select()
      .single();

    if (error) throw error;

    // Update paper balance
    const newBalance = direction === "BUY" 
      ? currentBalance - amountSEK 
      : currentBalance + amountSEK;

    await supabase
      .from("user_settings")
      .update({ paper_balance: newBalance })
      .eq("user_id", user?.id);

    // Create rule snapshot for analysis
    await createRuleSnapshot(trade.id, "paper");

    return {
      success: true,
      orderId: trade.id,
      message: `Paper trade utförd: ${direction} ${quantity} st ${instrumentType} @ ${price.toFixed(2)} SEK`,
      isPaperTrade: true,
    };
  };

  // Execute real trade via Avanza
  const executeRealTrade = async (params: ManualTradeParams): Promise<TradeResult> => {
    const { direction, instrumentType, amountSEK, price, notes } = params;
    
    const instrumentId = getInstrumentId(instrumentType);
    const quantity = Math.floor(amountSEK / price);

    if (quantity < 1) {
      throw new Error(`Beloppet är för litet. Minst ${price.toFixed(2)} SEK krävs för 1 enhet.`);
    }

    // Check if Avanza is configured
    if (!settings?.avanza_account_id) {
      throw new Error("Avanza-konto är inte konfigurerat. Gå till Inställningar.");
    }

    // Create a manual signal entry for tracking
    const { data: signal, error: signalError } = await supabase
      .from("signals")
      .insert({
        timestamp: new Date().toISOString(),
        signal_type: direction,
        strength: "MODERATE",
        probability_up: direction === "BUY" ? 60 : 40,
        probability_down: direction === "BUY" ? 40 : 60,
        confidence: 100,
        current_price: price,
        target_price: direction === "BUY" ? price * 1.02 : price * 0.98,
        stop_loss: direction === "BUY" ? price * 0.98 : price * 1.02,
        reasoning: `Manuell order: ${direction} ${instrumentType}${notes ? ` - ${notes}` : ""}`,
        is_active: false,
        auto_executed: false,
      })
      .select()
      .single();

    if (signalError) throw signalError;

    // Add to trade execution queue
    const { data: queueItem, error: queueError } = await supabase
      .from("trade_execution_queue")
      .insert({
        signal_id: signal.id,
        user_id: user?.id,
        status: "PENDING",
        metadata: {
          manual: true,
          instrument_type: instrumentType,
          instrument_id: instrumentId,
          quantity,
          amount_sek: amountSEK,
          notes,
        },
      } as Record<string, unknown>)
      .select()
      .single();

    if (queueError) throw queueError;

    // Trigger the trade queue processor
    const { error: execError } = await supabase.functions.invoke(
      "process-trade-queue",
      {
        body: { manual: true, queueId: queueItem.id },
      }
    );

    if (execError) {
      await supabase
        .from("trade_execution_queue")
        .update({ 
          status: "FAILED", 
          error_message: execError.message 
        })
        .eq("id", queueItem.id);
      
      throw new Error(`Handel misslyckades: ${execError.message}`);
    }

    // Create rule snapshot for analysis
    await createRuleSnapshot(queueItem.id, "live");

    return {
      success: true,
      orderId: queueItem.id,
      message: `Order skickad till Avanza: ${direction} ${quantity} st ${instrumentType}`,
      isPaperTrade: false,
    };
  };

  // Main trade mutation
  const tradeMutation = useMutation({
    mutationFn: async (params: ManualTradeParams) => {
      setIsProcessing(true);
      
      try {
        if (isPaperTrading) {
          return await executePaperTrade(params);
        } else {
          return await executeRealTrade(params);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    onSuccess: (result) => {
      toast({
        title: result.isPaperTrade ? "📝 Paper Trade" : "✅ Order Utförd",
        description: result.message,
      });
      
      queryClient.invalidateQueries({ queryKey: ["paper-trades"] });
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
      queryClient.invalidateQueries({ queryKey: ["today-stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Handel Misslyckades",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    executeTrade: tradeMutation.mutate,
    executeTradeAsync: tradeMutation.mutateAsync,
    isProcessing: tradeMutation.isPending || isProcessing,
    isPaperTrading,
    currentPrice,
    error: tradeMutation.error,
  };
}
