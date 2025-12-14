import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "./useAuth";

export interface RuleCondition {
  type: "price_change" | "rsi" | "macd" | "volume" | "time";
  // Price change conditions
  direction?: "up" | "down" | "any";
  min_percent?: number;
  max_percent?: number;
  duration_seconds?: number;
  // RSI conditions
  operator?: ">" | "<" | "between" | "crosses_above" | "crosses_below";
  value?: number | [number, number];
  // MACD conditions
  condition?: "bullish_cross" | "bearish_cross" | "histogram_positive" | "histogram_negative";
  // Volume conditions
  vs_average?: ">" | "<";
  multiplier?: number;
}

export interface ActionConfig {
  instrument: "BULL" | "BEAR" | "primary" | "counterweight";
  amount_type: "SEK" | "units" | "percent";
  amount: number;
}

export interface BacktestResults {
  win_rate: number;
  avg_return: number;
  trades: number;
  max_drawdown?: number;
  profit_factor?: number;
}

export interface TradingRule {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  rule_type: "BUY" | "SELL" | "BOTH";
  conditions: RuleCondition[];
  logic_operator: "AND" | "OR";
  action_config: ActionConfig;
  stop_loss_percent: number | null;
  take_profit_percent: number | null;
  trailing_stop: boolean;
  backtest_results: BacktestResults | null;
  is_active: boolean;
  is_system_suggested: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
  trigger_count: number;
}

export interface CreateRuleInput {
  name: string;
  description?: string;
  rule_type: "BUY" | "SELL" | "BOTH";
  conditions: RuleCondition[];
  logic_operator: "AND" | "OR";
  action_config: ActionConfig;
  stop_loss_percent?: number;
  take_profit_percent?: number;
  trailing_stop?: boolean;
}

export function useTradingRules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trading-rules", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("trading_rules")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((rule) => ({
        ...rule,
        conditions: rule.conditions as unknown as RuleCondition[],
        action_config: rule.action_config as unknown as ActionConfig,
        backtest_results: rule.backtest_results as unknown as BacktestResults | null,
      })) as TradingRule[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateRuleInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("trading_rules")
        .insert([{
          user_id: user.id,
          name: input.name,
          description: input.description,
          rule_type: input.rule_type,
          conditions: JSON.parse(JSON.stringify(input.conditions)) as Json,
          logic_operator: input.logic_operator,
          action_config: JSON.parse(JSON.stringify(input.action_config)) as Json,
          stop_loss_percent: input.stop_loss_percent,
          take_profit_percent: input.take_profit_percent,
          trailing_stop: input.trailing_stop,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-rules"] });
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      conditions,
      action_config,
      backtest_results,
      ...rest
    }: Partial<TradingRule> & { id: string }) => {
      const updates: Record<string, Json | string | number | boolean | null | undefined> = {};
      
      // Copy simple fields
      Object.entries(rest).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'user_id') {
          updates[key] = value as Json;
        }
      });
      
      // Handle JSON fields
      if (conditions) updates.conditions = JSON.parse(JSON.stringify(conditions)) as Json;
      if (action_config) updates.action_config = JSON.parse(JSON.stringify(action_config)) as Json;
      if (backtest_results) updates.backtest_results = JSON.parse(JSON.stringify(backtest_results)) as Json;
      
      const { data, error } = await supabase
        .from("trading_rules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-rules"] });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trading_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-rules"] });
    },
  });
}

export function useToggleRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("trading_rules")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-rules"] });
    },
  });
}
