import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface RulePerformance {
  ruleId: string;
  ruleName: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  totalProfitLoss: number;
  avgProfitPerTrade: number;
  avgLossPerTrade: number;
  performanceScore: number;
  avgHoldDuration: number;
  bestTrade: number;
  worstTrade: number;
  firstTradeAt: string | null;
  lastTradeAt: string | null;
}

export interface CombinationPerformance {
  ruleIds: string[];
  ruleNames: string[];
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalProfitLoss: number;
  improvementVsBaseline: number;
  combinationScore: number;
  confidenceLevel: number;
  sampleSizeSufficient: boolean;
}

export interface Recommendation {
  id: string;
  type: "enable_rule" | "disable_rule" | "try_combination" | "adjust_parameter";
  ruleId?: string;
  ruleIds?: string[];
  reasoning: string;
  expectedImprovement: number;
  confidenceScore: number;
  supportingData: {
    trades_analyzed?: number;
    win_rate?: number;
    profit_factor?: number;
    total_profit?: number;
    rules_in_combination?: string[];
  };
  status: string;
  createdAt: string;
}

export function useRulePerformance() {
  const { user } = useAuth();

  const { data: ruleStats, isLoading: rulesLoading, refetch: refetchRules } = useQuery({
    queryKey: ["rule-performance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rule_performance_stats")
        .select("*")
        .eq("user_id", user?.id)
        .order("performance_score", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(r => ({
        ruleId: r.rule_id,
        ruleName: r.rule_name,
        totalTrades: r.total_trades || 0,
        winningTrades: r.winning_trades || 0,
        losingTrades: r.losing_trades || 0,
        winRate: r.win_rate || 0,
        profitFactor: r.profit_factor || 0,
        totalProfitLoss: r.total_profit_loss_sek || 0,
        avgProfitPerTrade: r.avg_profit_per_trade || 0,
        avgLossPerTrade: r.avg_loss_per_trade || 0,
        performanceScore: r.performance_score || 0,
        avgHoldDuration: r.avg_hold_duration_seconds || 0,
        bestTrade: r.best_trade_sek || 0,
        worstTrade: r.worst_trade_sek || 0,
        firstTradeAt: r.first_trade_at,
        lastTradeAt: r.last_trade_at,
      })) as RulePerformance[];
    },
    enabled: !!user?.id,
  });

  const { data: combinationStats, isLoading: combinationsLoading, refetch: refetchCombinations } = useQuery({
    queryKey: ["combination-performance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rule_combination_stats")
        .select("*")
        .eq("user_id", user?.id)
        .order("combination_score", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      return (data || []).map(c => ({
        ruleIds: c.rule_ids || [],
        ruleNames: c.rule_names || [],
        totalTrades: c.total_trades || 0,
        winRate: c.win_rate || 0,
        profitFactor: c.profit_factor || 0,
        totalProfitLoss: c.total_profit_loss_sek || 0,
        improvementVsBaseline: c.improvement_vs_baseline_percent || 0,
        combinationScore: c.combination_score || 0,
        confidenceLevel: c.confidence_level || 0,
        sampleSizeSufficient: c.sample_size_sufficient || false,
      })) as CombinationPerformance[];
    },
    enabled: !!user?.id,
  });

  const bestRule = ruleStats?.[0];
  const bestCombination = combinationStats?.filter(c => c.sampleSizeSufficient)?.[0];

  return {
    ruleStats,
    combinationStats,
    bestRule,
    bestCombination,
    isLoading: rulesLoading || combinationsLoading,
    refetch: () => {
      refetchRules();
      refetchCombinations();
    },
  };
}

export function useRuleRecommendations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["rule-recommendations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rule_recommendations")
        .select("*")
        .eq("user_id", user?.id)
        .eq("status", "pending")
        .order("confidence_score", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(r => ({
        id: r.id,
        type: r.recommendation_type as Recommendation["type"],
        ruleId: r.rule_id,
        ruleIds: r.rule_ids,
        reasoning: r.reasoning,
        expectedImprovement: r.expected_improvement_percent || 0,
        confidenceScore: r.confidence_score || 0,
        supportingData: (r.supporting_data as Recommendation["supportingData"]) || {},
        status: r.status,
        createdAt: r.created_at,
      })) as Recommendation[];
    },
    enabled: !!user?.id,
  });

  const acceptRecommendation = useMutation({
    mutationFn: async (recommendationId: string) => {
      const recommendation = recommendations?.find(r => r.id === recommendationId);
      if (!recommendation) throw new Error("Recommendation not found");

      // Execute action based on type
      if (recommendation.type === "enable_rule" && recommendation.ruleId) {
        await supabase
          .from("trading_rules")
          .update({ is_active: true })
          .eq("id", recommendation.ruleId);
      } else if (recommendation.type === "disable_rule" && recommendation.ruleId) {
        await supabase
          .from("trading_rules")
          .update({ is_active: false })
          .eq("id", recommendation.ruleId);
      } else if (recommendation.type === "try_combination" && recommendation.ruleIds) {
        // Disable all rules first, then enable the combination
        await supabase
          .from("trading_rules")
          .update({ is_active: false })
          .eq("user_id", user?.id);
        
        await supabase
          .from("trading_rules")
          .update({ is_active: true })
          .in("id", recommendation.ruleIds);
      }

      // Mark as accepted
      await supabase
        .from("rule_recommendations")
        .update({ 
          status: "accepted", 
          actioned_at: new Date().toISOString() 
        })
        .eq("id", recommendationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rule-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["trading-rules"] });
      toast.success("Rekommendation tillämpad");
    },
    onError: (error: Error) => {
      toast.error(`Kunde inte tillämpa: ${error.message}`);
    },
  });

  const rejectRecommendation = useMutation({
    mutationFn: async ({ id, feedback }: { id: string; feedback?: string }) => {
      await supabase
        .from("rule_recommendations")
        .update({
          status: "rejected",
          user_feedback: feedback,
          actioned_at: new Date().toISOString(),
        })
        .eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rule-recommendations"] });
    },
  });

  const refreshAnalysis = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("recalculate-rule-stats", {
        body: { userId: user?.id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rule-performance"] });
      queryClient.invalidateQueries({ queryKey: ["combination-performance"] });
      queryClient.invalidateQueries({ queryKey: ["rule-recommendations"] });
      toast.success("Analys uppdaterad");
    },
    onError: (error: Error) => {
      toast.error(`Analys misslyckades: ${error.message}`);
    },
  });

  return {
    recommendations,
    isLoading,
    acceptRecommendation: acceptRecommendation.mutate,
    rejectRecommendation: rejectRecommendation.mutate,
    refreshAnalysis: refreshAnalysis.mutate,
    isRefreshing: refreshAnalysis.isPending,
    isAccepting: acceptRecommendation.isPending,
  };
}

// Hook for tracking rules at trade time
export function useTradeRuleTracking() {
  const { user } = useAuth();

  const createSnapshot = useMutation({
    mutationFn: async ({
      tradeId,
      tradeType,
      activeRules,
      triggeredRuleIds,
    }: {
      tradeId: string;
      tradeType: "paper" | "live";
      activeRules: { id: string; name: string; conditions: any }[];
      triggeredRuleIds?: string[];
    }) => {
      const { error } = await supabase
        .from("trade_rule_snapshot")
        .insert({
          trade_id: tradeId,
          trade_type: tradeType,
          active_rule_ids: activeRules.map(r => r.id),
          rule_names: activeRules.map(r => r.name),
          rule_conditions: activeRules.map(r => ({
            id: r.id,
            name: r.name,
            conditions: r.conditions,
          })),
          triggered_rule_ids: triggeredRuleIds || [],
        });

      if (error) throw error;
    },
  });

  const updateSnapshotResult = useMutation({
    mutationFn: async ({
      tradeId,
      profitLossSek,
      profitLossPercent,
      holdDurationSeconds,
    }: {
      tradeId: string;
      profitLossSek: number;
      profitLossPercent: number;
      holdDurationSeconds: number;
    }) => {
      const { error } = await supabase
        .from("trade_rule_snapshot")
        .update({
          profit_loss_sek: profitLossSek,
          profit_loss_percent: profitLossPercent,
          hold_duration_seconds: holdDurationSeconds,
        })
        .eq("trade_id", tradeId);

      if (error) throw error;

      // Trigger recalculation
      await supabase.functions.invoke("recalculate-rule-stats", {
        body: { userId: user?.id },
      });
    },
  });

  return {
    createSnapshot: createSnapshot.mutate,
    updateSnapshotResult: updateSnapshotResult.mutate,
  };
}