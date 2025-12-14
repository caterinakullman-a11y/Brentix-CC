import { useMemo } from "react";
import type { ToolResult } from "./useFrequencyAnalyzer";

interface PriceData {
  timestamp: string;
  close: number;
  high: number;
  low: number;
  open: number;
}

type PatternType = "DOUBLE_BOTTOM" | "DOUBLE_TOP" | "BREAKOUT" | "BREAKDOWN" | "DOJI" | "NONE";

interface DetectedPattern {
  type: PatternType;
  confidence: number;
  direction: "UP" | "DOWN" | "NEUTRAL";
}

export function useMicroPatternScanner(
  historicalPrices: PriceData[] | undefined,
  enabled: boolean = true
): ToolResult | null {
  return useMemo(() => {
    if (!enabled || !historicalPrices?.length || historicalPrices.length < 20) {
      return null;
    }

    const patterns = detectMicroPatterns(historicalPrices.slice(0, 30));
    
    if (patterns.length === 0) {
      return {
        name: "Micro-Pattern",
        score: 0,
        confidence: 40,
        signal: "HOLD",
        reasoning: "Inga mikromönster detekterade",
      };
    }

    // Get strongest pattern
    const strongest = patterns.reduce((best, curr) => 
      curr.confidence > best.confidence ? curr : best
    );

    const score = strongest.direction === "UP" ? 12 : strongest.direction === "DOWN" ? -12 : 0;
    const signal = strongest.direction === "UP" ? "BUY" : strongest.direction === "DOWN" ? "SELL" : "HOLD";

    const patternNames: Record<PatternType, string> = {
      DOUBLE_BOTTOM: "Dubbelbotten",
      DOUBLE_TOP: "Dubbeltopp",
      BREAKOUT: "Utbrott upp",
      BREAKDOWN: "Utbrott ner",
      DOJI: "Doji (osäkerhet)",
      NONE: "Inget",
    };

    return {
      name: "Micro-Pattern",
      score,
      confidence: strongest.confidence,
      signal,
      reasoning: `${patternNames[strongest.type]} detekterat (${strongest.confidence}% säkerhet)`,
    };
  }, [historicalPrices, enabled]);
}

function detectMicroPatterns(prices: PriceData[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Detect Double Bottom
  const doubleBottom = detectDoubleBottom(prices);
  if (doubleBottom) patterns.push(doubleBottom);

  // Detect Double Top
  const doubleTop = detectDoubleTop(prices);
  if (doubleTop) patterns.push(doubleTop);

  // Detect Breakout
  const breakout = detectBreakout(prices);
  if (breakout) patterns.push(breakout);

  // Detect Doji (indecision)
  const doji = detectDoji(prices);
  if (doji) patterns.push(doji);

  return patterns;
}

function detectDoubleBottom(prices: PriceData[]): DetectedPattern | null {
  if (prices.length < 10) return null;

  const lows = prices.map(p => p.low);
  const minPrice = Math.min(...lows);
  
  // Find two similar lows
  const minIndices = lows
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l < minPrice * 1.02)
    .map(({ i }) => i);

  if (minIndices.length >= 2 && minIndices[minIndices.length - 1] - minIndices[0] >= 3) {
    // Check if current price is above both lows
    const currentPrice = prices[0].close;
    if (currentPrice > minPrice * 1.01) {
      return {
        type: "DOUBLE_BOTTOM",
        confidence: 65,
        direction: "UP",
      };
    }
  }

  return null;
}

function detectDoubleTop(prices: PriceData[]): DetectedPattern | null {
  if (prices.length < 10) return null;

  const highs = prices.map(p => p.high);
  const maxPrice = Math.max(...highs);
  
  const maxIndices = highs
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => h > maxPrice * 0.98)
    .map(({ i }) => i);

  if (maxIndices.length >= 2 && maxIndices[maxIndices.length - 1] - maxIndices[0] >= 3) {
    const currentPrice = prices[0].close;
    if (currentPrice < maxPrice * 0.99) {
      return {
        type: "DOUBLE_TOP",
        confidence: 65,
        direction: "DOWN",
      };
    }
  }

  return null;
}

function detectBreakout(prices: PriceData[]): DetectedPattern | null {
  if (prices.length < 20) return null;

  const recent = prices.slice(0, 5);
  const older = prices.slice(5, 20);

  const recentHigh = Math.max(...recent.map(p => p.high));
  const olderHigh = Math.max(...older.map(p => p.high));
  const olderLow = Math.min(...older.map(p => p.low));

  // Breakout up
  if (recentHigh > olderHigh * 1.005) {
    return {
      type: "BREAKOUT",
      confidence: 60,
      direction: "UP",
    };
  }

  // Breakdown
  const recentLow = Math.min(...recent.map(p => p.low));
  if (recentLow < olderLow * 0.995) {
    return {
      type: "BREAKDOWN",
      confidence: 60,
      direction: "DOWN",
    };
  }

  return null;
}

function detectDoji(prices: PriceData[]): DetectedPattern | null {
  if (prices.length < 1) return null;

  const latest = prices[0];
  const bodySize = Math.abs(latest.close - latest.open);
  const totalRange = latest.high - latest.low;

  // Doji: body is less than 10% of total range
  if (totalRange > 0 && bodySize / totalRange < 0.1) {
    return {
      type: "DOJI",
      confidence: 55,
      direction: "NEUTRAL",
    };
  }

  return null;
}
