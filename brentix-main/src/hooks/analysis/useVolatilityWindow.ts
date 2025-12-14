import { useMemo } from "react";
import type { ToolResult } from "./useFrequencyAnalyzer";

interface PriceData {
  timestamp: string;
  close: number;
  high: number;
  low: number;
}

interface HourlyStats {
  hour: number;
  volatility: number;
  avgReturn: number;
  sampleSize: number;
}

export function useVolatilityWindow(
  historicalPrices: PriceData[] | undefined,
  enabled: boolean = true
): ToolResult | null {
  return useMemo(() => {
    if (!enabled || !historicalPrices?.length || historicalPrices.length < 24) {
      return null;
    }

    // Analyze volatility per hour (0-23)
    const hourlyStats: HourlyStats[] = Array.from({ length: 24 }, (_, hour) => {
      const pricesInHour = historicalPrices.filter(p => 
        new Date(p.timestamp).getHours() === hour
      );

      if (pricesInHour.length < 2) {
        return { hour, volatility: 0, avgReturn: 0, sampleSize: 0 };
      }

      // Calculate volatility (high-low range)
      const volatility = pricesInHour.reduce((sum, p) => 
        sum + (p.high - p.low) / p.close, 0
      ) / pricesInHour.length;

      // Calculate average return
      let totalReturn = 0;
      for (let i = 1; i < pricesInHour.length; i++) {
        totalReturn += (pricesInHour[i].close - pricesInHour[i - 1].close) / pricesInHour[i - 1].close;
      }
      const avgReturn = (totalReturn / (pricesInHour.length - 1)) * 100;

      return {
        hour,
        volatility: volatility * 100,
        avgReturn,
        sampleSize: pricesInHour.length,
      };
    });

    const currentHour = new Date().getHours();
    const currentWindow = hourlyStats[currentHour];

    // Rank current hour by return potential
    const sortedByReturn = [...hourlyStats]
      .filter(h => h.sampleSize > 0)
      .sort((a, b) => b.avgReturn - a.avgReturn);
    
    const rank = sortedByReturn.findIndex(h => h.hour === currentHour) + 1;
    const totalRanked = sortedByReturn.length;

    const isGoodWindow = rank <= Math.ceil(totalRanked / 3);
    const isBadWindow = rank > Math.ceil(totalRanked * 2 / 3);

    return {
      name: "Volatility Window",
      score: isGoodWindow ? 10 : isBadWindow ? -10 : 0,
      confidence: Math.min(currentWindow.sampleSize * 5, 90),
      signal: isGoodWindow ? "BUY" : "HOLD",
      reasoning: `Timme ${currentHour}:00 rankas #${rank}/${totalRanked} historiskt`,
    };
  }, [historicalPrices, enabled]);
}
