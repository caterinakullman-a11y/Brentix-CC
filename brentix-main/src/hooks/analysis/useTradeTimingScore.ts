import { useMemo } from "react";
import type { ToolResult } from "./useFrequencyAnalyzer";

interface PriceData {
  timestamp: string;
  close: number;
  high: number;
  low: number;
}

export function useTradeTimingScore(
  historicalPrices: PriceData[] | undefined,
  currentPrice: number | undefined,
  enabled: boolean = true
): ToolResult | null {
  return useMemo(() => {
    if (!enabled || !historicalPrices?.length || !currentPrice) {
      return null;
    }

    const factors = {
      volatilityOk: isVolatilityInRange(historicalPrices),
      trendAlignment: checkTrendAlignment(historicalPrices),
      supportResistance: nearSupportResistance(historicalPrices, currentPrice),
      timeOfDay: isGoodTradingTime(),
      marketOpen: isMarketOpen(),
    };

    let score = 50; // Neutral start

    if (factors.volatilityOk) score += 12;
    if (factors.trendAlignment === "UP") score += 15;
    else if (factors.trendAlignment === "DOWN") score -= 10;
    
    if (factors.supportResistance === "support") score += 10;
    else if (factors.supportResistance === "resistance") score -= 10;
    
    if (factors.timeOfDay) score += 8;
    if (!factors.marketOpen) score -= 25;

    score = Math.max(0, Math.min(100, score));

    let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
    if (score >= 70) signal = "BUY";
    else if (score <= 30) signal = "SELL";

    const scoreLabel = score >= 70 ? "Bra läge!" : score <= 30 ? "Dåligt läge" : "Neutralt";

    return {
      name: "Trade Timing",
      score: score > 70 ? 15 : score > 50 ? 5 : score < 30 ? -15 : 0,
      confidence: score,
      signal,
      reasoning: `Timing Score: ${score}/100 - ${scoreLabel}`,
    };
  }, [historicalPrices, currentPrice, enabled]);
}

function isVolatilityInRange(prices: PriceData[]): boolean {
  if (prices.length < 20) return true;

  const recent = prices.slice(0, 20);
  const volatility = recent.reduce((sum, p) => 
    sum + (p.high - p.low) / p.close, 0
  ) / recent.length * 100;

  // Good volatility range: 0.3% - 2%
  return volatility >= 0.3 && volatility <= 2;
}

function checkTrendAlignment(prices: PriceData[]): "UP" | "DOWN" | "NEUTRAL" {
  if (prices.length < 20) return "NEUTRAL";

  const sma5 = prices.slice(0, 5).reduce((s, p) => s + p.close, 0) / 5;
  const sma20 = prices.slice(0, 20).reduce((s, p) => s + p.close, 0) / 20;

  const diff = (sma5 - sma20) / sma20 * 100;

  if (diff > 0.5) return "UP";
  if (diff < -0.5) return "DOWN";
  return "NEUTRAL";
}

function nearSupportResistance(
  prices: PriceData[], 
  currentPrice: number
): "support" | "resistance" | "none" {
  if (prices.length < 50) return "none";

  const highs = prices.slice(0, 50).map(p => p.high);
  const lows = prices.slice(0, 50).map(p => p.low);

  const resistance = Math.max(...highs);
  const support = Math.min(...lows);

  const range = resistance - support;
  const threshold = range * 0.05; // Within 5% of level

  if (Math.abs(currentPrice - support) < threshold) return "support";
  if (Math.abs(currentPrice - resistance) < threshold) return "resistance";
  return "none";
}

function isGoodTradingTime(): boolean {
  const hour = new Date().getHours();
  // Good hours: 9-11 (European open), 14-16 (US open overlap)
  return (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16);
}

function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  // Weekend
  if (day === 0 || day === 6) return false;
  
  // Oil markets roughly 00:00 - 23:00 with some breaks
  // For simplicity, consider open 8:00 - 22:00
  return hour >= 8 && hour < 22;
}
