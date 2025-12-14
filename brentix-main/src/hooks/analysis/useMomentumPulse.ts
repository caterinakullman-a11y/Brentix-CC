import { useMemo } from "react";
import type { ToolResult } from "./useFrequencyAnalyzer";

interface PriceData {
  timestamp: string;
  close: number;
}

export function useMomentumPulse(
  historicalPrices: PriceData[] | undefined,
  currentPrice: number | undefined,
  enabled: boolean = true
): ToolResult | null {
  return useMemo(() => {
    if (!enabled || !historicalPrices?.length || !currentPrice) {
      return null;
    }

    const now = Date.now();
    const getChange = (seconds: number): number => {
      const targetTime = now - seconds * 1000;
      const relevantPrices = historicalPrices.filter(p => 
        new Date(p.timestamp).getTime() >= targetTime
      );
      if (relevantPrices.length < 2) return 0;
      const oldest = relevantPrices[relevantPrices.length - 1].close;
      return ((currentPrice - oldest) / oldest) * 100;
    };

    const changes = {
      last1min: getChange(60),
      last5min: getChange(300),
      last15min: getChange(900),
      last1hour: getChange(3600),
    };

    // Calculate acceleration
    const shortTermAccel = changes.last1min - (changes.last5min / 5);
    const mediumTermAccel = changes.last5min - (changes.last15min / 3);
    
    // Combined pulse strength
    const pulseStrength = Math.abs(shortTermAccel * 50 + mediumTermAccel * 30);
    const isPositivePulse = shortTermAccel > 0;

    if (pulseStrength < 3) {
      return {
        name: "Momentum Pulse",
        score: 0,
        confidence: 30,
        signal: "HOLD",
        reasoning: "Ingen signifikant momentum-puls detekterad",
      };
    }

    const clampedStrength = Math.min(pulseStrength, 25);

    return {
      name: "Momentum Pulse",
      score: isPositivePulse ? clampedStrength : -clampedStrength,
      confidence: Math.min(pulseStrength * 3, 95),
      signal: isPositivePulse ? "BUY" : "SELL",
      reasoning: `${isPositivePulse ? "Positiv" : "Negativ"} puls: ${pulseStrength.toFixed(1)}% acceleration`,
    };
  }, [historicalPrices, currentPrice, enabled]);
}
