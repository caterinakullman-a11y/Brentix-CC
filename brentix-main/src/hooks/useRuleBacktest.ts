import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { TradingRule, RuleCondition } from "./useTradingRules";

export interface BacktestSummary {
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  maxDrawdownPercent: number;
}

export interface SimulatedTrade {
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  direction: 'BUY' | 'SELL';
  sizeSek: number;
  profitLossSek: number;
  profitLossPercent: number;
  holdDurationSeconds: number;
  exitReason: string;
}

export interface BacktestResult {
  id: string;
  user_id: string;
  rule_id: string | null;
  rule_name: string;
  rule_conditions: RuleCondition[];
  test_period_start: string;
  test_period_end: string;
  initial_capital_sek: number;
  position_size_sek: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_profit_loss_sek: number;
  total_profit_loss_percent: number;
  gross_profit_sek: number;
  gross_loss_sek: number;
  profit_factor: number | null;
  best_trade_sek: number | null;
  worst_trade_sek: number | null;
  avg_trade_sek: number | null;
  max_drawdown_sek: number | null;
  max_drawdown_percent: number | null;
  avg_hold_duration_seconds: number | null;
  simulated_trades: SimulatedTrade[];
  equity_curve: { timestamp: string; equity: number; drawdown: number }[];
  calculation_time_ms: number | null;
  data_points_analyzed: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface RunBacktestInput {
  rule: TradingRule;
  periodStart?: string;
  periodEnd?: string;
  initialCapital?: number;
  positionSize?: number;
}

// Convert rule conditions to edge function format
function convertConditions(conditions: RuleCondition[]): { indicator: string; operator: string; value: number | string }[] {
  return conditions.map(c => {
    let indicator = '';
    let operator = '';
    let value: number | string = 0;

    switch (c.type) {
      case 'rsi':
        indicator = 'RSI';
        operator = c.operator || '>';
        value = typeof c.value === 'number' ? c.value : (Array.isArray(c.value) ? c.value[0] : 50);
        break;
      case 'macd':
        indicator = c.condition?.includes('histogram') ? 'MACD_HISTOGRAM' : 'MACD';
        if (c.condition === 'bullish_cross') {
          operator = 'crosses_above';
          value = 'signal_line';
        } else if (c.condition === 'bearish_cross') {
          operator = 'crosses_below';
          value = 'signal_line';
        } else if (c.condition === 'histogram_positive') {
          operator = '>';
          value = 0;
        } else {
          operator = '<';
          value = 0;
        }
        break;
      case 'price_change':
        indicator = 'PRICE';
        operator = c.direction === 'up' ? '>' : '<';
        value = c.min_percent || 0;
        break;
      default:
        indicator = 'RSI';
        operator = '>';
        value = 50;
    }

    return { indicator, operator, value };
  });
}

export function useRunRuleBacktest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      rule,
      periodStart,
      periodEnd,
      initialCapital = 100000,
      positionSize = 1000,
    }: RunBacktestInput): Promise<{ summary: BacktestSummary; fullResults: BacktestResult }> => {
      if (!user?.id) throw new Error("Inte inloggad");

      // Default to last 30 days if no period specified
      const end = periodEnd || new Date().toISOString();
      const start = periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase.functions.invoke('run-rule-backtest', {
        body: {
          userId: user.id,
          ruleId: rule.id,
          ruleName: rule.name,
          conditions: convertConditions(rule.conditions),
          action: rule.rule_type === 'SELL' ? 'SELL' : 'BUY',
          periodStart: start,
          periodEnd: end,
          initialCapital,
          positionSize,
          stopLossPercent: rule.stop_loss_percent || undefined,
          takeProfitPercent: rule.take_profit_percent || undefined,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Backtest misslyckades');

      return {
        summary: data.summary,
        fullResults: data.fullResults,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trading-rules"] });
      queryClient.invalidateQueries({ queryKey: ["backtest-results", variables.rule.id] });
      queryClient.invalidateQueries({ queryKey: ["backtest-history"] });
    },
  });
}

// Fetch backtest history for a rule
export function useBacktestHistory(ruleId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["backtest-results", ruleId],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from("rule_backtest_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (ruleId) {
        query = query.eq("rule_id", ruleId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as unknown as BacktestResult[];
    },
    enabled: !!user?.id,
  });
}

// Fetch all user's backtest history
export function useAllBacktestHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["backtest-history"],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("rule_backtest_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []) as unknown as BacktestResult[];
    },
    enabled: !!user?.id,
  });
}
