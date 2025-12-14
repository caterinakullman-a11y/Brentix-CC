import { useMemo } from "react";
import type { ToolResult } from "./useFrequencyAnalyzer";

interface PriceData {
  timestamp: string;
  close: number;
  high: number;
  low: number;
}

interface ExitStrategy {
  optimalHoldTime: string;
  suggestedTarget: number;
  suggestedStop: number;
  confidence: number;
}

export function useSmartExitOptimizer(
  historicalPrices: PriceData[] | undefined,
  currentPrice: number | undefined,
  enabled: boolean = true
): ToolResult | null {
  return useMemo(() => {
    if (!enabled || !historicalPrices?.length || !currentPrice || historicalPrices.length < 100) {
      return null;
    }

    const strategy = calculateOptimalExit(historicalPrices, currentPrice);

    return {
      name: "Smart Exit",
      score: strategy.confidence > 60 ? 10 : strategy.confidence > 40 ? 5 : 0,
      confidence: strategy.confidence,
      signal: "HOLD", // This tool doesn't give buy/sell, just exit strategy
      reasoning: `Optimal hålltid: ${strategy.optimalHoldTime}, Target: +${((strategy.suggestedTarget / currentPrice - 1) * 100).toFixed(1)}%`,
    };
  }, [historicalPrices, currentPrice, enabled]);
}

function calculateOptimalExit(prices: PriceData[], currentPrice: number): ExitStrategy {
  // Analyze different holding periods
  const holdPeriods = [
    { minutes: 5, label: "5 min" },
    { minutes: 15, label: "15 min" },
    { minutes: 60, label: "1 timme" },
    { minutes: 240, label: "4 timmar" },
    { minutes: 1440, label: "1 dag" },
  ];

  const results = holdPeriods.map(period => {
    const returns = calculateReturnsForPeriod(prices, period.minutes);
    return {
      ...period,
      avgReturn: returns.avg,
      maxDrawdown: returns.maxDrawdown,
      winRate: returns.winRate,
      score: calculateExitScore(returns),
    };
  });

  // Find optimal period
  const optimal = results.reduce((best, curr) => 
    curr.score > best.score ? curr : best
  );

  // Calculate suggested targets based on historical volatility
  const avgVolatility = prices.slice(0, 50).reduce((sum, p) => 
    sum + (p.high - p.low) / p.close, 0
  ) / 50 * 100;

  const suggestedTarget = currentPrice * (1 + avgVolatility * 0.5 / 100);
  const suggestedStop = currentPrice * (1 - avgVolatility * 0.3 / 100);

  return {
    optimalHoldTime: optimal.label,
    suggestedTarget,
    suggestedStop,
    confidence: Math.min(optimal.score, 90),
  };
}

function calculateReturnsForPeriod(
  prices: PriceData[], 
  minutesPeriod: number
): { avg: number; maxDrawdown: number; winRate: number } {
  const msPerMinute = 60 * 1000;
  const periodMs = minutesPeriod * msPerMinute;
  
  const returns: number[] = [];
  let wins = 0;
  let maxDrawdown = 0;

  for (let i = 0; i < prices.length - 1; i++) {
    const entryTime = new Date(prices[i].timestamp).getTime();
    
    // Find exit price after holding period
    const exitIndex = prices.findIndex((p, j) => 
      j > i && new Date(p.timestamp).getTime() >= entryTime + periodMs
    );

    if (exitIndex > 0) {
      const entryPrice = prices[i].close;
      const exitPrice = prices[exitIndex].close;
      const returnPct = (exitPrice - entryPrice) / entryPrice * 100;
      
      returns.push(returnPct);
      if (returnPct > 0) wins++;

      // Calculate drawdown during hold
      const holdPrices = prices.slice(i, exitIndex + 1);
      const minPrice = Math.min(...holdPrices.map(p => p.low));
      const drawdown = (entryPrice - minPrice) / entryPrice * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
  }

  if (returns.length === 0) {
    return { avg: 0, maxDrawdown: 0, winRate: 50 };
  }

  return {
    avg: returns.reduce((a, b) => a + b, 0) / returns.length,
    maxDrawdown,
    winRate: (wins / returns.length) * 100,
  };
}

function calculateExitScore(returns: { avg: number; maxDrawdown: number; winRate: number }): number {
  // Combine: high win rate + positive avg return + low drawdown
  const winScore = returns.winRate * 0.4;
  const returnScore = Math.max(0, (returns.avg + 5) * 5) * 0.3; // Normalize around 0
  const drawdownScore = Math.max(0, (5 - returns.maxDrawdown) * 10) * 0.3;

  return Math.min(100, Math.max(0, winScore + returnScore + drawdownScore));
}
