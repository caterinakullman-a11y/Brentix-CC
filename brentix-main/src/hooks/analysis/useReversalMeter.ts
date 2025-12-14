import { useMemo } from "react";
import type { ToolResult } from "./useFrequencyAnalyzer";

interface PriceData {
  timestamp: string;
  close: number;
  high: number;
  low: number;
}

export function useReversalMeter(
  historicalPrices: PriceData[] | undefined,
  enabled: boolean = true
): ToolResult | null {
  return useMemo(() => {
    if (!enabled || !historicalPrices?.length || historicalPrices.length < 20) {
      return null;
    }

    // Calculate RSI (14 periods)
    const rsi = calculateRSI(historicalPrices, 14);
    
    // Calculate Bollinger Band position
    const bbPosition = calculateBBPosition(historicalPrices, 20);
    
    // Detect divergence
    const hasDivergence = detectDivergence(historicalPrices);

    // Calculate reversal probability
    let reversalProbability = 0;
    let direction: "UP" | "DOWN" | "NONE" = "NONE";

    if (rsi > 80) {
      reversalProbability = (rsi - 80) * 4;
      direction = "DOWN";
    } else if (rsi < 20) {
      reversalProbability = (20 - rsi) * 4;
      direction = "UP";
    }

    if (bbPosition > 0.95) {
      reversalProbability += 15;
      if (direction === "NONE") direction = "DOWN";
    } else if (bbPosition < 0.05) {
      reversalProbability += 15;
      if (direction === "NONE") direction = "UP";
    }

    if (hasDivergence) {
      reversalProbability += 10;
    }

    reversalProbability = Math.min(reversalProbability, 95);

    if (reversalProbability < 25) {
      return {
        name: "Reversal Meter",
        score: 0,
        confidence: 40,
        signal: "HOLD",
        reasoning: `Låg vändningssannolikhet (${reversalProbability.toFixed(0)}%)`,
      };
    }

    return {
      name: "Reversal Meter",
      score: direction === "UP" ? 15 : -15,
      confidence: reversalProbability,
      signal: direction === "UP" ? "BUY" : "SELL",
      reasoning: `⚠️ ${reversalProbability.toFixed(0)}% sannolikhet för vändning ${direction === "UP" ? "uppåt" : "nedåt"}`,
    };
  }, [historicalPrices, enabled]);
}

function calculateRSI(prices: PriceData[], period: number): number {
  if (prices.length < period + 1) return 50;

  const changes = prices.slice(0, period + 1).map((p, i, arr) => 
    i === 0 ? 0 : p.close - arr[i - 1].close
  ).slice(1);

  const gains = changes.filter(c => c > 0);
  const losses = changes.filter(c => c < 0).map(c => Math.abs(c));

  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateBBPosition(prices: PriceData[], period: number): number {
  if (prices.length < period) return 0.5;

  const closes = prices.slice(0, period).map(p => p.close);
  const sma = closes.reduce((a, b) => a + b, 0) / period;
  const variance = closes.reduce((sum, c) => sum + Math.pow(c - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = sma + 2 * stdDev;
  const lower = sma - 2 * stdDev;
  const current = prices[0].close;

  if (upper === lower) return 0.5;
  return (current - lower) / (upper - lower);
}

function detectDivergence(prices: PriceData[]): boolean {
  if (prices.length < 10) return false;

  // Simple divergence: price making new highs but momentum slowing
  const recent = prices.slice(0, 5);
  const previous = prices.slice(5, 10);

  const recentHigh = Math.max(...recent.map(p => p.high));
  const previousHigh = Math.max(...previous.map(p => p.high));
  
  const recentMomentum = (recent[0].close - recent[recent.length - 1].close) / recent[recent.length - 1].close;
  const previousMomentum = (previous[0].close - previous[previous.length - 1].close) / previous[previous.length - 1].close;

  // Bearish divergence: higher high but lower momentum
  if (recentHigh > previousHigh && recentMomentum < previousMomentum * 0.5) {
    return true;
  }

  // Bullish divergence: lower low but higher momentum
  const recentLow = Math.min(...recent.map(p => p.low));
  const previousLow = Math.min(...previous.map(p => p.low));
  
  if (recentLow < previousLow && recentMomentum > previousMomentum * 0.5) {
    return true;
  }

  return false;
}
