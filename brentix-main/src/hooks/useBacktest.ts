import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { TradingRule, RuleCondition, BacktestResults } from "./useTradingRules";
import type { Json } from "@/integrations/supabase/types";

interface HistoricalPrice {
  date: string;
  price: number;
}

interface SimulatedTrade {
  entry_date: string;
  entry_price: number;
  exit_date: string;
  exit_price: number;
  profit_percent: number;
  profit_sek: number;
  type: "BUY" | "SELL";
}

interface BacktestRunResult {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  gross_profit: number;
  gross_loss: number;
  net_profit: number;
  win_rate: number;
  profit_factor: number;
  avg_win: number;
  avg_loss: number;
  max_drawdown_percent: number;
  max_consecutive_losses: number;
  trades: SimulatedTrade[];
  equity_curve: { date: string; equity: number }[];
}

// Calculate RSI from price data
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate EMA
function calculateEMA(prices: number[], period: number): number[] {
  const multiplier = 2 / (period + 1);
  const ema: number[] = [prices[0]];
  
  for (let i = 1; i < prices.length; i++) {
    ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1]);
  }
  
  return ema;
}

// Calculate MACD
function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = calculateEMA(macdLine.slice(-9), 9);
  
  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  
  return {
    macd,
    signal,
    histogram: macd - signal,
  };
}

// Evaluate a single condition
function evaluateCondition(
  condition: RuleCondition,
  prices: HistoricalPrice[],
  index: number
): boolean {
  const priceValues = prices.slice(0, index + 1).map(p => p.price);
  
  switch (condition.type) {
    case "price_change": {
      const lookback = Math.min(5, index);
      if (lookback === 0) return false;
      
      const currentPrice = priceValues[index];
      const previousPrice = priceValues[index - lookback];
      const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
      
      const minPercent = condition.min_percent || 0;
      
      if (condition.direction === "up") {
        return changePercent >= minPercent;
      } else if (condition.direction === "down") {
        return changePercent <= -minPercent;
      } else {
        return Math.abs(changePercent) >= minPercent;
      }
    }
    
    case "rsi": {
      const rsi = calculateRSI(priceValues);
      const value = typeof condition.value === "number" ? condition.value : 50;
      
      switch (condition.operator) {
        case "<": return rsi < value;
        case ">": return rsi > value;
        case "crosses_above": {
          if (index < 1) return false;
          const prevRsi = calculateRSI(priceValues.slice(0, -1));
          return prevRsi < value && rsi >= value;
        }
        case "crosses_below": {
          if (index < 1) return false;
          const prevRsi = calculateRSI(priceValues.slice(0, -1));
          return prevRsi > value && rsi <= value;
        }
        default: return false;
      }
    }
    
    case "macd": {
      const { macd, signal, histogram } = calculateMACD(priceValues);
      
      switch (condition.condition) {
        case "bullish_cross": {
          if (index < 1) return false;
          const prev = calculateMACD(priceValues.slice(0, -1));
          return prev.macd < prev.signal && macd >= signal;
        }
        case "bearish_cross": {
          if (index < 1) return false;
          const prev = calculateMACD(priceValues.slice(0, -1));
          return prev.macd > prev.signal && macd <= signal;
        }
        case "histogram_positive": return histogram > 0;
        case "histogram_negative": return histogram < 0;
        default: return false;
      }
    }
    
    default:
      return false;
  }
}

// Evaluate all conditions for a rule
function evaluateRule(
  rule: TradingRule,
  prices: HistoricalPrice[],
  index: number
): boolean {
  if (index < 26) return false; // Need enough data for indicators
  
  const results = rule.conditions.map(c => evaluateCondition(c, prices, index));
  
  if (rule.logic_operator === "AND") {
    return results.every(r => r);
  } else {
    return results.some(r => r);
  }
}

// Run backtest simulation
function runBacktestSimulation(
  rule: TradingRule,
  prices: HistoricalPrice[],
  initialCapital: number = 100000
): BacktestRunResult {
  const trades: SimulatedTrade[] = [];
  const equityCurve: { date: string; equity: number }[] = [];
  let equity = initialCapital;
  let position: { entry_date: string; entry_price: number; amount: number } | null = null;
  let consecutiveLosses = 0;
  let maxConsecutiveLosses = 0;
  let peakEquity = initialCapital;
  let maxDrawdownPercent = 0;

  const positionSize = rule.action_config.amount || 1000;
  const stopLossPercent = rule.stop_loss_percent || 5;
  const takeProfitPercent = rule.take_profit_percent || 3;

  for (let i = 26; i < prices.length; i++) {
    const currentPrice = prices[i].price;
    const currentDate = prices[i].date;

    // Check exit conditions if in position
    if (position) {
      const profitPercent = ((currentPrice - position.entry_price) / position.entry_price) * 100;
      
      let shouldExit = false;
      
      // Stop loss hit
      if (profitPercent <= -stopLossPercent) {
        shouldExit = true;
      }
      // Take profit hit
      if (profitPercent >= takeProfitPercent) {
        shouldExit = true;
      }
      // End of data
      if (i === prices.length - 1) {
        shouldExit = true;
      }

      if (shouldExit) {
        const profitSek = (profitPercent / 100) * position.amount;
        trades.push({
          entry_date: position.entry_date,
          entry_price: position.entry_price,
          exit_date: currentDate,
          exit_price: currentPrice,
          profit_percent: profitPercent,
          profit_sek: profitSek,
          type: "BUY",
        });

        equity += profitSek;
        
        if (profitSek < 0) {
          consecutiveLosses++;
          maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
        } else {
          consecutiveLosses = 0;
        }

        position = null;
      }
    }

    // Check entry conditions if not in position
    if (!position && evaluateRule(rule, prices, i)) {
      position = {
        entry_date: currentDate,
        entry_price: currentPrice,
        amount: Math.min(positionSize, equity * 0.1), // Max 10% of equity
      };
    }

    // Update equity curve and drawdown
    const currentEquity = position 
      ? equity + ((currentPrice - position.entry_price) / position.entry_price) * position.amount
      : equity;
    
    equityCurve.push({ date: currentDate, equity: currentEquity });
    
    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }
    const drawdown = ((peakEquity - currentEquity) / peakEquity) * 100;
    maxDrawdownPercent = Math.max(maxDrawdownPercent, drawdown);
  }

  // Calculate statistics
  const winningTrades = trades.filter(t => t.profit_sek > 0);
  const losingTrades = trades.filter(t => t.profit_sek <= 0);
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.profit_sek, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit_sek, 0));

  return {
    total_trades: trades.length,
    winning_trades: winningTrades.length,
    losing_trades: losingTrades.length,
    gross_profit: grossProfit,
    gross_loss: grossLoss,
    net_profit: grossProfit - grossLoss,
    win_rate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
    profit_factor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    avg_win: winningTrades.length > 0 ? grossProfit / winningTrades.length : 0,
    avg_loss: losingTrades.length > 0 ? grossLoss / losingTrades.length : 0,
    max_drawdown_percent: maxDrawdownPercent,
    max_consecutive_losses: maxConsecutiveLosses,
    trades,
    equity_curve: equityCurve,
  };
}

export function useRunBacktest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      rule,
      startDate,
      endDate,
    }: {
      rule: TradingRule;
      startDate?: Date;
      endDate?: Date;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Fetch historical prices
      let query = supabase
        .from("historical_prices")
        .select("date, price")
        .order("date", { ascending: true });

      if (startDate) {
        query = query.gte("date", startDate.toISOString().split("T")[0]);
      }
      if (endDate) {
        query = query.lte("date", endDate.toISOString().split("T")[0]);
      }

      const { data: prices, error: pricesError } = await query;
      if (pricesError) throw pricesError;
      if (!prices || prices.length < 50) {
        throw new Error("Inte tillräckligt med historisk data för backtest");
      }

      // Run simulation
      const result = runBacktestSimulation(rule, prices);

      // Save backtest run
      const { error: insertError } = await supabase
        .from("backtest_runs")
        .insert({
          user_id: user.id,
          rule_id: rule.id,
          start_date: prices[0].date,
          end_date: prices[prices.length - 1].date,
          total_trades: result.total_trades,
          winning_trades: result.winning_trades,
          losing_trades: result.losing_trades,
          gross_profit: result.gross_profit,
          gross_loss: result.gross_loss,
          net_profit: result.net_profit,
          win_rate: result.win_rate,
          profit_factor: result.profit_factor,
          avg_win: result.avg_win,
          avg_loss: result.avg_loss,
          max_drawdown_percent: result.max_drawdown_percent,
          max_consecutive_losses: result.max_consecutive_losses,
          trades: JSON.parse(JSON.stringify(result.trades)) as Json,
          equity_curve: JSON.parse(JSON.stringify(result.equity_curve)) as Json,
        });

      if (insertError) throw insertError;

      // Update rule with backtest results
      const backtestResults: BacktestResults = {
        win_rate: result.win_rate,
        avg_return: result.net_profit > 0 && result.total_trades > 0 
          ? (result.net_profit / (rule.action_config.amount * result.total_trades)) * 100 
          : 0,
        trades: result.total_trades,
        max_drawdown: result.max_drawdown_percent,
        profit_factor: result.profit_factor,
      };

      await supabase
        .from("trading_rules")
        .update({
          backtest_results: JSON.parse(JSON.stringify(backtestResults)) as Json,
        })
        .eq("id", rule.id);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-rules"] });
      queryClient.invalidateQueries({ queryKey: ["backtest-runs"] });
    },
  });
}

// Predefined system rules
export const PREDEFINED_RULES = [
  {
    name: "RSI Översåld Studs",
    description: "Köp när RSI < 30 och börjar stiga uppåt",
    rule_type: "BUY" as const,
    conditions: [
      { type: "rsi" as const, operator: "crosses_above" as const, value: 30 },
    ],
    logic_operator: "AND" as const,
    action_config: { instrument: "BULL" as const, amount_type: "SEK" as const, amount: 1000 },
    stop_loss_percent: 5,
    take_profit_percent: 3,
    is_system_suggested: true,
  },
  {
    name: "MACD Golden Cross",
    description: "Köp när MACD-linjen korsar signallinjen uppåt",
    rule_type: "BUY" as const,
    conditions: [
      { type: "macd" as const, condition: "bullish_cross" as const },
    ],
    logic_operator: "AND" as const,
    action_config: { instrument: "BULL" as const, amount_type: "SEK" as const, amount: 1000 },
    stop_loss_percent: 5,
    take_profit_percent: 3,
    is_system_suggested: true,
  },
  {
    name: "Momentum Uppgång",
    description: "Köp vid stark prisuppgång (>0.5%)",
    rule_type: "BUY" as const,
    conditions: [
      { type: "price_change" as const, direction: "up" as const, min_percent: 0.5 },
    ],
    logic_operator: "AND" as const,
    action_config: { instrument: "BULL" as const, amount_type: "SEK" as const, amount: 1000 },
    stop_loss_percent: 5,
    take_profit_percent: 3,
    is_system_suggested: true,
  },
  {
    name: "RSI Överköpt SÄLJ",
    description: "Sälj/Köp BEAR när RSI > 70 och börjar falla",
    rule_type: "BUY" as const,
    conditions: [
      { type: "rsi" as const, operator: "crosses_below" as const, value: 70 },
    ],
    logic_operator: "AND" as const,
    action_config: { instrument: "BEAR" as const, amount_type: "SEK" as const, amount: 1000 },
    stop_loss_percent: 5,
    take_profit_percent: 3,
    is_system_suggested: true,
  },
  {
    name: "MACD Death Cross",
    description: "Köp BEAR när MACD-linjen korsar signallinjen nedåt",
    rule_type: "BUY" as const,
    conditions: [
      { type: "macd" as const, condition: "bearish_cross" as const },
    ],
    logic_operator: "AND" as const,
    action_config: { instrument: "BEAR" as const, amount_type: "SEK" as const, amount: 1000 },
    stop_loss_percent: 5,
    take_profit_percent: 3,
    is_system_suggested: true,
  },
  {
    name: "RSI + MACD Kombination",
    description: "Stark köpsignal: MACD bullish cross OCH RSI under 40",
    rule_type: "BUY" as const,
    conditions: [
      { type: "macd" as const, condition: "bullish_cross" as const },
      { type: "rsi" as const, operator: "<" as const, value: 40 },
    ],
    logic_operator: "AND" as const,
    action_config: { instrument: "BULL" as const, amount_type: "SEK" as const, amount: 1000 },
    stop_loss_percent: 5,
    take_profit_percent: 4,
    is_system_suggested: true,
  },
];

export function useAddPredefinedRules() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const rules = PREDEFINED_RULES.map(rule => ({
        user_id: user.id,
        name: rule.name,
        description: rule.description,
        rule_type: rule.rule_type,
        conditions: JSON.parse(JSON.stringify(rule.conditions)) as Json,
        logic_operator: rule.logic_operator,
        action_config: JSON.parse(JSON.stringify(rule.action_config)) as Json,
        stop_loss_percent: rule.stop_loss_percent,
        take_profit_percent: rule.take_profit_percent,
        is_system_suggested: rule.is_system_suggested,
        is_active: false,
      }));

      const { data, error } = await supabase
        .from("trading_rules")
        .insert(rules)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trading-rules"] });
    },
  });
}
