import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface RuleCondition {
  type: string;
  operator?: string;
  value?: number;
  min_percent?: number;
  direction?: string;
  condition?: string;
  startHour?: number;
  start_hour?: number;
  endHour?: number;
  end_hour?: number;
  days?: number[];
}

interface TradingRule {
  id: string;
  name: string;
  rule_type: string;
  conditions: RuleCondition[];
  logic_operator: string;
  stop_loss_percent: number | null;
  take_profit_percent: number | null;
  action_config: Record<string, unknown>;
}

interface Trade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  profit: number;
  profitPercent: number;
  type: string;
}

interface BacktestResults {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  netProfit: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number | null;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  maxConsecutiveLosses: number;
  trades: Trade[];
  equityCurve: { date: string; equity: number }[];
}

interface BacktestOptions {
  rule: TradingRule;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
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
  return 100 - 100 / (1 + rs);
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
function calculateMACD(
  prices: number[]
): { macd: number; signal: number; histogram: number } {
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

// Evaluate a condition
function evaluateCondition(
  condition: RuleCondition,
  prices: { date: string; price: number }[],
  index: number
): boolean {
  const priceValues = prices.slice(0, index + 1).map((p) => p.price);

  switch (condition.type) {
    case "price_change": {
      const lookback = Math.min(5, index);
      if (lookback === 0) return false;

      const currentPrice = priceValues[index];
      const previousPrice = priceValues[index - lookback];
      const changePercent =
        ((currentPrice - previousPrice) / previousPrice) * 100;

      const minPercent = condition.min_percent || condition.value || 0;

      if (condition.direction === "up" || condition.operator === "gt") {
        return changePercent >= minPercent;
      } else if (condition.direction === "down" || condition.operator === "lt") {
        return changePercent <= -minPercent;
      } else {
        return Math.abs(changePercent) >= minPercent;
      }
    }

    case "rsi": {
      const rsi = calculateRSI(priceValues);
      const value = typeof condition.value === "number" ? condition.value : 50;

      switch (condition.operator) {
        case "lt":
        case "<":
          return rsi < value;
        case "gt":
        case ">":
          return rsi > value;
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
        default:
          return false;
      }
    }

    case "macd": {
      const { macd, signal } = calculateMACD(priceValues);

      switch (condition.operator || condition.condition) {
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
        case "histogram_positive":
          return macd - signal > 0;
        case "histogram_negative":
          return macd - signal < 0;
        default:
          return false;
      }
    }

    case "time_range": {
      const date = new Date(prices[index].date);
      const hour = date.getHours();
      const startHour = condition.startHour ?? condition.start_hour ?? 0;
      const endHour = condition.endHour ?? condition.end_hour ?? 23;
      return hour >= startHour && hour <= endHour;
    }

    case "day_of_week": {
      const date = new Date(prices[index].date);
      const day = date.getDay();
      const days = condition.days ?? [];
      return days.includes(day);
    }

    default:
      return false;
  }
}

// Evaluate rule
function evaluateRule(
  rule: TradingRule,
  prices: { date: string; price: number }[],
  index: number
): boolean {
  if (index < 26) return false;

  const results = rule.conditions.map((c) =>
    evaluateCondition(c, prices, index)
  );

  if (rule.logic_operator === "AND") {
    return results.every((r) => r);
  } else {
    return results.some((r) => r);
  }
}

export function useBacktest() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BacktestResults | null>(null);

  const runBacktest = useCallback(
    async (options: BacktestOptions) => {
      const { rule, startDate, endDate, initialCapital } = options;

      setIsRunning(true);
      setProgress(0);
      setResults(null);

      try {
        // Fetch price data
        const { data: priceData, error: priceError } = await supabase
          .from("price_data")
          .select("timestamp, close")
          .gte("timestamp", startDate.toISOString())
          .lte("timestamp", endDate.toISOString())
          .order("timestamp", { ascending: true });

        if (priceError) throw priceError;

        if (!priceData || priceData.length < 50) {
          throw new Error("Inte tillräckligt med data för backtest");
        }

        const prices = priceData.map((p) => ({
          date: p.timestamp,
          price: p.close,
        }));

        // Run simulation
        const trades: Trade[] = [];
        const equityCurve: { date: string; equity: number }[] = [];
        let equity = initialCapital;
        let position: {
          entryDate: string;
          entryPrice: number;
          amount: number;
        } | null = null;
        let consecutiveLosses = 0;
        let maxConsecutiveLosses = 0;
        let peakEquity = initialCapital;
        let maxDrawdownPercent = 0;

        const stopLossPercent = rule.stop_loss_percent || 5;
        const takeProfitPercent = rule.take_profit_percent || 3;
        const positionSize = Math.min(initialCapital * 0.1, 10000);

        for (let i = 26; i < prices.length; i++) {
          // Update progress
          if (i % 100 === 0) {
            setProgress(((i - 26) / (prices.length - 26)) * 100);
          }

          const currentPrice = prices[i].price;
          const currentDate = prices[i].date;

          // Check exit if in position
          if (position) {
            const profitPercent =
              ((currentPrice - position.entryPrice) / position.entryPrice) *
              100;

            let shouldExit = false;

            if (profitPercent <= -stopLossPercent) shouldExit = true;
            if (profitPercent >= takeProfitPercent) shouldExit = true;
            if (i === prices.length - 1) shouldExit = true;

            if (shouldExit) {
              const profit = (profitPercent / 100) * position.amount;

              trades.push({
                entryDate: position.entryDate,
                exitDate: currentDate,
                entryPrice: position.entryPrice,
                exitPrice: currentPrice,
                profit,
                profitPercent,
                type: rule.rule_type,
              });

              equity += profit;

              if (profit < 0) {
                consecutiveLosses++;
                maxConsecutiveLosses = Math.max(
                  maxConsecutiveLosses,
                  consecutiveLosses
                );
              } else {
                consecutiveLosses = 0;
              }

              position = null;
            }
          }

          // Check entry if not in position
          if (!position && evaluateRule(rule, prices, i)) {
            position = {
              entryDate: currentDate,
              entryPrice: currentPrice,
              amount: Math.min(positionSize, equity * 0.1),
            };
          }

          // Update equity curve
          const currentEquity = position
            ? equity +
              ((currentPrice - position.entryPrice) / position.entryPrice) *
                position.amount
            : equity;

          equityCurve.push({ date: currentDate, equity: currentEquity });

          if (currentEquity > peakEquity) {
            peakEquity = currentEquity;
          }
          const drawdown =
            ((peakEquity - currentEquity) / peakEquity) * 100;
          maxDrawdownPercent = Math.max(maxDrawdownPercent, drawdown);
        }

        setProgress(100);

        // Calculate statistics
        const winningTrades = trades.filter((t) => t.profit > 0);
        const losingTrades = trades.filter((t) => t.profit <= 0);
        const grossProfit = winningTrades.reduce((sum, t) => sum + t.profit, 0);
        const grossLoss = Math.abs(
          losingTrades.reduce((sum, t) => sum + t.profit, 0)
        );

        // Calculate Sharpe ratio (simplified)
        const returns = trades.map((t) => t.profitPercent);
        const avgReturn =
          returns.length > 0
            ? returns.reduce((a, b) => a + b, 0) / returns.length
            : 0;
        const stdDev =
          returns.length > 1
            ? Math.sqrt(
                returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
                  (returns.length - 1)
              )
            : 0;
        const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : null;

        const backtestResults: BacktestResults = {
          totalTrades: trades.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
          netProfit: grossProfit - grossLoss,
          winRate:
            trades.length > 0
              ? (winningTrades.length / trades.length) * 100
              : 0,
          profitFactor:
            grossLoss > 0
              ? grossProfit / grossLoss
              : grossProfit > 0
              ? Infinity
              : 0,
          maxDrawdown: maxDrawdownPercent,
          sharpeRatio,
          avgWin:
            winningTrades.length > 0
              ? grossProfit / winningTrades.length
              : 0,
          avgLoss:
            losingTrades.length > 0 ? grossLoss / losingTrades.length : 0,
          bestTrade:
            trades.length > 0 ? Math.max(...trades.map((t) => t.profit)) : 0,
          worstTrade:
            trades.length > 0 ? Math.min(...trades.map((t) => t.profit)) : 0,
          maxConsecutiveLosses,
          trades,
          equityCurve,
        };

        setResults(backtestResults);

        // Save to database if logged in
        if (user?.id) {
          await supabase.from("backtest_runs").insert({
            user_id: user.id,
            rule_id: rule.id,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            total_trades: backtestResults.totalTrades,
            winning_trades: backtestResults.winningTrades,
            losing_trades: backtestResults.losingTrades,
            net_profit: backtestResults.netProfit,
            win_rate: backtestResults.winRate,
            profit_factor:
              backtestResults.profitFactor === Infinity
                ? 999
                : backtestResults.profitFactor,
            max_drawdown_percent: backtestResults.maxDrawdown,
            max_consecutive_losses: backtestResults.maxConsecutiveLosses,
            trades: JSON.stringify(trades),
            equity_curve: JSON.stringify(equityCurve),
          });
        }

        return backtestResults;
      } catch (error) {
        console.error("Backtest error:", error);
        throw error;
      } finally {
        setIsRunning(false);
      }
    },
    [user]
  );

  return {
    runBacktest,
    isRunning,
    progress,
    results,
  };
}
