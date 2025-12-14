import { useMemo } from "react";
import type { ToolResult } from "./useFrequencyAnalyzer";

interface PriceData {
  timestamp: string;
  close: number;
  high: number;
  low: number;
}

export function useRiskPerMinute(
  historicalPrices: PriceData[] | undefined,
  enabled: boolean = true
): ToolResult | null {
  return useMemo(() => {
    if (!enabled || !historicalPrices?.length || historicalPrices.length < 60) {
      return null;
    }

    // Calculate risk per minute (volatility adjusted)
    const riskMetrics = calculateRiskMetrics(historicalPrices);

    // Determine if current risk level is acceptable
    const isHighRisk = riskMetrics.currentRiskPerMin > riskMetrics.avgRiskPerMin * 1.5;
    const isLowRisk = riskMetrics.currentRiskPerMin < riskMetrics.avgRiskPerMin * 0.5;

    let score = 0;
    let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
    let reasoning = "";

    if (isHighRisk) {
      score = -15;
      signal = "HOLD";
      reasoning = `⚠️ Hög risk: ${(riskMetrics.currentRiskPerMin * 100).toFixed(2)}%/min (snitt: ${(riskMetrics.avgRiskPerMin * 100).toFixed(2)}%/min)`;
    } else if (isLowRisk) {
      score = 10;
      signal = "BUY";
      reasoning = `✅ Låg risk: ${(riskMetrics.currentRiskPerMin * 100).toFixed(2)}%/min - Bra ingångsläge`;
    } else {
      score = 5;
      signal = "HOLD";
      reasoning = `Normal risk: ${(riskMetrics.currentRiskPerMin * 100).toFixed(2)}%/min`;
    }

    return {
      name: "Risk/Minut",
      score,
      confidence: Math.min(riskMetrics.sampleSize * 2, 85),
      signal,
      reasoning,
    };
  }, [historicalPrices, enabled]);
}

function calculateRiskMetrics(prices: PriceData[]): {
  currentRiskPerMin: number;
  avgRiskPerMin: number;
  sampleSize: number;
} {
  // Calculate volatility per minute for recent prices
  const recentPrices = prices.slice(0, 30);
  const olderPrices = prices.slice(30, 60);

  const calcVolatilityPerMin = (priceSet: PriceData[]): number => {
    if (priceSet.length < 2) return 0;

    let totalVolatility = 0;
    let totalMinutes = 0;

    for (let i = 1; i < priceSet.length; i++) {
      const timeDiff = Math.abs(
        new Date(priceSet[i - 1].timestamp).getTime() - 
        new Date(priceSet[i].timestamp).getTime()
      ) / 60000; // Convert to minutes

      if (timeDiff > 0) {
        const priceChange = Math.abs(priceSet[i].close - priceSet[i - 1].close) / priceSet[i - 1].close;
        totalVolatility += priceChange;
        totalMinutes += timeDiff;
      }
    }

    return totalMinutes > 0 ? totalVolatility / totalMinutes : 0;
  };

  const currentRiskPerMin = calcVolatilityPerMin(recentPrices);
  const avgRiskPerMin = calcVolatilityPerMin(olderPrices);

  return {
    currentRiskPerMin,
    avgRiskPerMin: avgRiskPerMin || currentRiskPerMin, // Fallback if not enough data
    sampleSize: recentPrices.length,
  };
}
