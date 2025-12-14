import { useMemo } from "react";

interface PriceData {
  timestamp: string;
  close: number;
  open: number;
  high: number;
  low: number;
}

export interface ToolResult {
  name: string;
  score: number;
  confidence: number;
  signal: "BUY" | "SELL" | "HOLD";
  reasoning: string;
}

interface IntervalResult {
  seconds: number;
  name: string;
  score: number;
  accuracy: number;
  returnPercent: number;
  noiseRatio: number;
}

const INTERVALS = [
  { seconds: 60, name: "1 min" },
  { seconds: 300, name: "5 min" },
  { seconds: 900, name: "15 min" },
  { seconds: 3600, name: "1 timme" },
  { seconds: 14400, name: "4 timmar" },
  { seconds: 86400, name: "1 dag" },
];

export function useFrequencyAnalyzer(
  historicalPrices: PriceData[] | undefined,
  enabled: boolean = true
): ToolResult | null {
  return useMemo(() => {
    if (!enabled || !historicalPrices?.length || historicalPrices.length < 50) {
      return null;
    }

    const results: IntervalResult[] = INTERVALS.map(interval => {
      const trades = simulateTradesWithInterval(historicalPrices, interval.seconds);
      return {
        ...interval,
        score: trades.optimalScore,
        accuracy: trades.winRate,
        returnPercent: trades.totalReturn,
        noiseRatio: trades.noiseRatio,
      };
    });

    const optimal = results.reduce((best, curr) => 
      curr.score > best.score ? curr : best
    );

    return {
      name: "Frekvensanalysator",
      score: optimal.score > 70 ? 15 : optimal.score > 50 ? 5 : -5,
      confidence: Math.min(optimal.score, 95),
      signal: optimal.score > 60 ? "BUY" : "HOLD",
      reasoning: `Optimalt intervall: ${optimal.name} (Score: ${optimal.score}/100)`,
    };
  }, [historicalPrices, enabled]);
}

function simulateTradesWithInterval(
  prices: PriceData[], 
  intervalSeconds: number
): { winRate: number; totalReturn: number; noiseRatio: number; optimalScore: number } {
  if (prices.length < 10) {
    return { winRate: 0, totalReturn: 0, noiseRatio: 1, optimalScore: 0 };
  }

  // Group prices by interval
  const intervalMs = intervalSeconds * 1000;
  const grouped: PriceData[][] = [];
  let currentGroup: PriceData[] = [];
  let groupStart = new Date(prices[0].timestamp).getTime();

  for (const price of prices) {
    const priceTime = new Date(price.timestamp).getTime();
    if (priceTime - groupStart > intervalMs) {
      if (currentGroup.length > 0) {
        grouped.push(currentGroup);
      }
      currentGroup = [price];
      groupStart = priceTime;
    } else {
      currentGroup.push(price);
    }
  }
  if (currentGroup.length > 0) {
    grouped.push(currentGroup);
  }

  if (grouped.length < 5) {
    return { winRate: 50, totalReturn: 0, noiseRatio: 0.5, optimalScore: 30 };
  }

  // Simulate momentum trades
  let wins = 0;
  let losses = 0;
  let totalReturn = 0;
  let noiseSum = 0;

  for (let i = 1; i < grouped.length - 1; i++) {
    const prevGroup = grouped[i - 1];
    const currGroup = grouped[i];
    const nextGroup = grouped[i + 1];

    const prevClose = prevGroup[prevGroup.length - 1].close;
    const currClose = currGroup[currGroup.length - 1].close;
    const nextClose = nextGroup[nextGroup.length - 1].close;

    const prevChange = (currClose - prevClose) / prevClose;
    const nextChange = (nextClose - currClose) / currClose;

    // If momentum continues
    if ((prevChange > 0 && nextChange > 0) || (prevChange < 0 && nextChange < 0)) {
      wins++;
      totalReturn += Math.abs(nextChange) * 100;
    } else {
      losses++;
      totalReturn -= Math.abs(nextChange) * 100;
    }

    // Calculate noise (intra-interval volatility)
    const intraVolatility = currGroup.reduce((sum, p) => {
      return sum + Math.abs(p.high - p.low) / p.close;
    }, 0) / currGroup.length;
    noiseSum += intraVolatility;
  }

  const tradeCount = wins + losses;
  const winRate = tradeCount > 0 ? (wins / tradeCount) * 100 : 50;
  const avgNoise = noiseSum / Math.max(grouped.length - 2, 1);
  const noiseRatio = Math.min(avgNoise * 100, 1);

  // Calculate optimal score: high win rate + good returns + low noise
  const optimalScore = Math.round(
    (winRate * 0.4) + 
    (Math.max(0, Math.min(totalReturn + 50, 100)) * 0.3) + 
    ((1 - noiseRatio) * 100 * 0.3)
  );

  return {
    winRate,
    totalReturn,
    noiseRatio,
    optimalScore: Math.max(0, Math.min(100, optimalScore)),
  };
}
