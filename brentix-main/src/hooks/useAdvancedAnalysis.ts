import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { usePriceData } from "./usePriceData";
import { usePriceHistory } from "./usePriceHistory";
import {
  useFrequencyAnalyzer,
  useMomentumPulse,
  useVolatilityWindow,
  useReversalMeter,
  useTradeTimingScore,
  useSmartExitOptimizer,
  useCorrelationRadar,
  useRiskPerMinute,
  useMicroPatternScanner,
  type ToolResult,
} from "./analysis";

export interface CombinedRecommendation {
  action: "BUY_BULL" | "SELL_BULL" | "BUY_BEAR" | "SELL_BEAR" | "HOLD";
  confidence: number;
  factors: ToolResult[];
  strategy: {
    entry: number;
    target: number;
    stopLoss: number;
    suggestedHoldTime: string;
  };
}

interface ToolSettings {
  frequency_analyzer_enabled: boolean;
  momentum_pulse_enabled: boolean;
  volatility_window_enabled: boolean;
  micro_pattern_enabled: boolean;
  smart_exit_enabled: boolean;
  reversal_meter_enabled: boolean;
  timing_score_enabled: boolean;
  correlation_radar_enabled: boolean;
  risk_per_minute_enabled: boolean;
  frequency_lookback_days: number;
  momentum_sensitivity: number;
  volatility_window_hours: number;
}

const DEFAULT_SETTINGS: ToolSettings = {
  frequency_analyzer_enabled: true,
  momentum_pulse_enabled: true,
  volatility_window_enabled: true,
  micro_pattern_enabled: true,
  smart_exit_enabled: true,
  reversal_meter_enabled: true,
  timing_score_enabled: true,
  correlation_radar_enabled: true,
  risk_per_minute_enabled: true,
  frequency_lookback_days: 30,
  momentum_sensitivity: 1.0,
  volatility_window_hours: 168,
};

export function useAdvancedAnalysis() {
  const { user } = useAuth();
  const { currentPrice } = usePriceData();
  const { data: priceHistory } = usePriceHistory("1W");
  const queryClient = useQueryClient();

  // Fetch user's tool settings
  const { data: toolSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["analysis-tool-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return DEFAULT_SETTINGS;
      
      const { data, error } = await supabase
        .from("analysis_tool_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data || DEFAULT_SETTINGS;
    },
    enabled: !!user?.id,
  });

  // Mutation to update settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<ToolSettings>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("analysis_tool_settings")
        .upsert({
          user_id: user.id,
          ...toolSettings,
          ...updates,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysis-tool-settings"] });
    },
  });

  const settings = toolSettings || DEFAULT_SETTINGS;

  // Transform price history for analysis hooks
  const historicalPrices = useMemo(() => {
    if (!priceHistory?.length) return undefined;
    return priceHistory.map(p => ({
      timestamp: p.time,
      close: p.price,
      open: p.price,
      high: p.high,
      low: p.low,
    }));
  }, [priceHistory]);

  // Calculate each tool's result
  const frequencyResult = useFrequencyAnalyzer(
    historicalPrices,
    settings.frequency_analyzer_enabled
  );
  
  const momentumResult = useMomentumPulse(
    historicalPrices,
    currentPrice,
    settings.momentum_pulse_enabled
  );
  
  const volatilityResult = useVolatilityWindow(
    historicalPrices,
    settings.volatility_window_enabled
  );
  
  const microPatternResult = useMicroPatternScanner(
    historicalPrices,
    settings.micro_pattern_enabled
  );
  
  const smartExitResult = useSmartExitOptimizer(
    historicalPrices,
    currentPrice,
    settings.smart_exit_enabled
  );
  
  const reversalResult = useReversalMeter(
    historicalPrices,
    settings.reversal_meter_enabled
  );
  
  const timingResult = useTradeTimingScore(
    historicalPrices,
    currentPrice,
    settings.timing_score_enabled
  );
  
  const correlationResult = useCorrelationRadar(
    settings.correlation_radar_enabled
  );
  
  const riskPerMinuteResult = useRiskPerMinute(
    historicalPrices,
    settings.risk_per_minute_enabled
  );

  // Combine all results
  const combinedRecommendation = useMemo(() => {
    const factors = [
      frequencyResult,
      momentumResult,
      volatilityResult,
      microPatternResult,
      smartExitResult,
      reversalResult,
      timingResult,
      correlationResult,
      riskPerMinuteResult,
    ].filter((f): f is ToolResult => f !== null);

    return calculateCombinedRecommendation(factors, currentPrice || 0);
  }, [
    frequencyResult,
    momentumResult,
    volatilityResult,
    microPatternResult,
    smartExitResult,
    reversalResult,
    timingResult,
    correlationResult,
    riskPerMinuteResult,
    currentPrice,
  ]);

  return {
    toolSettings: settings,
    updateSettings: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
    frequencyResult,
    momentumResult,
    volatilityResult,
    microPatternResult,
    smartExitResult,
    reversalResult,
    timingResult,
    correlationResult,
    riskPerMinuteResult,
    combinedRecommendation,
    isLoading: settingsLoading,
  };
}

function calculateCombinedRecommendation(
  factors: ToolResult[],
  currentPrice: number
): CombinedRecommendation {
  if (factors.length === 0 || currentPrice === 0) {
    return {
      action: "HOLD",
      confidence: 0,
      factors: [],
      strategy: {
        entry: currentPrice,
        target: currentPrice,
        stopLoss: currentPrice,
        suggestedHoldTime: "-",
      },
    };
  }

  // Calculate weighted score
  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
  const avgConfidence = factors.reduce((sum, f) => sum + f.confidence, 0) / factors.length;

  // Determine action
  let action: CombinedRecommendation["action"] = "HOLD";
  
  if (totalScore > 25) {
    action = "BUY_BULL";
  } else if (totalScore > 10) {
    action = "BUY_BULL"; // Could also be more conservative
  } else if (totalScore < -25) {
    action = "BUY_BEAR";
  } else if (totalScore < -10) {
    action = "BUY_BEAR";
  }

  // Calculate strategy
  const volatilityFactor = 1 + Math.abs(totalScore) / 200; // 0.5% - 1.5% range
  const targetPercent = Math.abs(totalScore) > 20 ? 0.015 : 0.01;
  const stopPercent = Math.abs(totalScore) > 20 ? 0.01 : 0.02;

  const isBullish = totalScore > 0;
  
  return {
    action,
    confidence: Math.min(avgConfidence, 95),
    factors,
    strategy: {
      entry: currentPrice,
      target: isBullish 
        ? currentPrice * (1 + targetPercent) 
        : currentPrice * (1 - targetPercent),
      stopLoss: isBullish 
        ? currentPrice * (1 - stopPercent) 
        : currentPrice * (1 + stopPercent),
      suggestedHoldTime: Math.abs(totalScore) > 30 ? "15-60 min" : "5-15 min",
    },
  };
}
