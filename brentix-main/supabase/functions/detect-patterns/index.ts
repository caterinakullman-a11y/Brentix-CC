import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriceData {
  date: string;
  price: number;
}

interface PatternMatch {
  pattern_type: string;
  pattern_name: string;
  start_date: string;
  end_date: string;
  confidence: number;
  direction: string;
  entry_price: number;
  target_price?: number;
  stop_loss?: number;
  metadata: Record<string, unknown>;
}

// Calculate RSI
function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  if (prices.length < period + 1) return rsi;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = 0; i < period; i++) rsi.push(0);

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - 100 / (1 + rs));

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  return rsi;
}

// Calculate SMA
function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(0);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

// Calculate EMA
function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      ema.push(0);
    } else if (i === period - 1) {
      const sum = prices.slice(0, period).reduce((a, b) => a + b, 0);
      ema.push(sum / period);
    } else {
      ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1]);
    }
  }
  return ema;
}

// Calculate MACD
function calculateMACD(prices: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12.map((v, i) => v - ema26[i]);
  const signal = calculateEMA(macd.slice(25), 9);
  const fullSignal = [...Array(25).fill(0), ...signal];
  const histogram = macd.map((v, i) => v - (fullSignal[i] || 0));
  return { macd, signal: fullSignal, histogram };
}

// Calculate Bollinger Bands
function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number[]; middle: number[]; lower: number[]; width: number[] } {
  const middle = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const width: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(0);
      lower.push(0);
      width.push(0);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = middle[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
      width.push((upper[i] - lower[i]) / middle[i] * 100);
    }
  }

  return { upper, middle, lower, width };
}

// Pattern detection functions
function detectRSIOversoldBounce(data: PriceData[], rsi: number[]): PatternMatch[] {
  const matches: PatternMatch[] = [];
  
  for (let i = 2; i < data.length; i++) {
    // RSI was below 30 and crossed above 35
    if (rsi[i - 2] < 30 && rsi[i - 1] < 35 && rsi[i] > 35) {
      matches.push({
        pattern_type: "RSI_OVERSOLD_BOUNCE",
        pattern_name: "RSI Oversold Bounce",
        start_date: data[i - 2].date,
        end_date: data[i].date,
        confidence: Math.min(1, (35 - rsi[i - 2]) / 15),
        direction: "BULLISH",
        entry_price: data[i].price,
        target_price: data[i].price * 1.05,
        stop_loss: data[i].price * 0.97,
        metadata: { rsi_low: rsi[i - 2], rsi_signal: rsi[i] },
      });
    }
  }
  
  return matches;
}

function detectMACDGoldenCross(data: PriceData[], macd: number[], signal: number[]): PatternMatch[] {
  const matches: PatternMatch[] = [];
  
  for (let i = 1; i < data.length; i++) {
    // MACD crosses above signal line
    if (macd[i - 1] < signal[i - 1] && macd[i] > signal[i] && macd[i] < 0) {
      matches.push({
        pattern_type: "MACD_GOLDEN_CROSS",
        pattern_name: "MACD Golden Cross",
        start_date: data[i - 1].date,
        end_date: data[i].date,
        confidence: Math.min(1, Math.abs(macd[i] - signal[i]) / 2 + 0.5),
        direction: "BULLISH",
        entry_price: data[i].price,
        target_price: data[i].price * 1.04,
        stop_loss: data[i].price * 0.98,
        metadata: { macd: macd[i], signal: signal[i] },
      });
    }
  }
  
  return matches;
}

function detectVolatilitySqueeze(data: PriceData[], bbWidth: number[]): PatternMatch[] {
  const matches: PatternMatch[] = [];
  
  // Find the 10th percentile of BB width
  const sortedWidths = [...bbWidth.filter(w => w > 0)].sort((a, b) => a - b);
  const threshold = sortedWidths[Math.floor(sortedWidths.length * 0.1)] || 5;
  
  for (let i = 6; i < data.length; i++) {
    // Squeeze: 5 days of low volatility followed by expansion
    const squeezeDays = bbWidth.slice(i - 5, i).filter(w => w < threshold).length;
    if (squeezeDays >= 4 && bbWidth[i] > threshold * 1.5) {
      const priceChange = (data[i].price - data[i - 1].price) / data[i - 1].price;
      matches.push({
        pattern_type: "VOLATILITY_SQUEEZE",
        pattern_name: "Volatility Squeeze",
        start_date: data[i - 5].date,
        end_date: data[i].date,
        confidence: Math.min(1, squeezeDays / 5),
        direction: priceChange > 0 ? "BULLISH" : "BEARISH",
        entry_price: data[i].price,
        metadata: { squeeze_days: squeezeDays, bb_width_expansion: bbWidth[i] / threshold },
      });
    }
  }
  
  return matches;
}

function detectMeanReversion(data: PriceData[], sma20: number[]): PatternMatch[] {
  const matches: PatternMatch[] = [];
  
  for (let i = 1; i < data.length; i++) {
    if (sma20[i] === 0) continue;
    
    const prevDeviation = (data[i - 1].price - sma20[i - 1]) / sma20[i - 1];
    const currDeviation = (data[i].price - sma20[i]) / sma20[i];
    
    // Price was > 2 std away and is reverting
    if (Math.abs(prevDeviation) > 0.05 && Math.abs(currDeviation) < Math.abs(prevDeviation) * 0.7) {
      matches.push({
        pattern_type: "MEAN_REVERSION",
        pattern_name: "Mean Reversion",
        start_date: data[i - 1].date,
        end_date: data[i].date,
        confidence: Math.min(1, Math.abs(prevDeviation) * 10),
        direction: prevDeviation < 0 ? "BULLISH" : "BEARISH",
        entry_price: data[i].price,
        target_price: sma20[i],
        metadata: { prev_deviation: prevDeviation, curr_deviation: currDeviation },
      });
    }
  }
  
  return matches;
}

function detectMomentumBreakout(data: PriceData[], rsi: number[], sma20: number[]): PatternMatch[] {
  const matches: PatternMatch[] = [];
  
  for (let i = 20; i < data.length; i++) {
    const lookback = data.slice(i - 20, i);
    const maxPrice = Math.max(...lookback.map(d => d.price));
    
    // Price breaks above 20-day high with RSI > 60
    if (data[i].price > maxPrice && rsi[i] > 60) {
      matches.push({
        pattern_type: "MOMENTUM_BREAKOUT",
        pattern_name: "Momentum Breakout",
        start_date: data[i - 5].date,
        end_date: data[i].date,
        confidence: Math.min(1, (rsi[i] - 50) / 30),
        direction: "BULLISH",
        entry_price: data[i].price,
        target_price: data[i].price * 1.06,
        stop_loss: maxPrice * 0.98,
        metadata: { breakout_price: maxPrice, rsi: rsi[i] },
      });
    }
  }
  
  return matches;
}

function detectDoubleBottom(data: PriceData[]): PatternMatch[] {
  const matches: PatternMatch[] = [];
  
  for (let i = 25; i < data.length; i++) {
    const window = data.slice(i - 25, i + 1);
    const prices = window.map(d => d.price);
    const minPrice = Math.min(...prices);
    
    // Find two lows within 3% of each other
    const lows: number[] = [];
    for (let j = 2; j < prices.length - 2; j++) {
      if (prices[j] < prices[j - 1] && prices[j] < prices[j - 2] && 
          prices[j] < prices[j + 1] && prices[j] < prices[j + 2]) {
        lows.push(j);
      }
    }
    
    if (lows.length >= 2) {
      const first = lows[0];
      const second = lows[lows.length - 1];
      const tolerance = 0.03;
      
      if (second - first >= 10 && 
          Math.abs(prices[first] - prices[second]) / prices[first] < tolerance) {
        // Check for neckline break
        const neckline = Math.max(...prices.slice(first, second));
        if (prices[prices.length - 1] > neckline) {
          matches.push({
            pattern_type: "DOUBLE_BOTTOM",
            pattern_name: "Double Bottom",
            start_date: window[first].date,
            end_date: window[window.length - 1].date,
            confidence: Math.min(1, 1 - Math.abs(prices[first] - prices[second]) / prices[first] / tolerance),
            direction: "BULLISH",
            entry_price: prices[prices.length - 1],
            target_price: prices[prices.length - 1] + (neckline - prices[first]),
            stop_loss: Math.min(prices[first], prices[second]) * 0.98,
            metadata: { first_bottom: prices[first], second_bottom: prices[second], neckline },
          });
        }
      }
    }
  }
  
  return matches;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for date range
    let startDate: string | undefined;
    let endDate: string | undefined;
    
    try {
      const body = await req.json();
      startDate = body.start_date;
      endDate = body.end_date;
    } catch {
      // No body provided, scan all data
    }

    console.log(`Detecting patterns from ${startDate || 'beginning'} to ${endDate || 'now'}...`);

    // Fetch historical prices
    let query = supabase
      .from("historical_prices")
      .select("date, price")
      .order("date", { ascending: true });

    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data: priceData, error: priceError } = await query;
    if (priceError) throw priceError;

    if (!priceData || priceData.length < 50) {
      return new Response(
        JSON.stringify({ error: "Not enough price data for pattern detection (need at least 50 points)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing ${priceData.length} price points...`);

    const prices = priceData.map(d => d.price);
    
    // Calculate indicators
    const rsi = calculateRSI(prices);
    const sma20 = calculateSMA(prices, 20);
    const { macd, signal } = calculateMACD(prices);
    const { width: bbWidth } = calculateBollingerBands(prices);

    // Detect patterns
    const allMatches: PatternMatch[] = [
      ...detectRSIOversoldBounce(priceData, rsi),
      ...detectMACDGoldenCross(priceData, macd, signal),
      ...detectVolatilitySqueeze(priceData, bbWidth),
      ...detectMeanReversion(priceData, sma20),
      ...detectMomentumBreakout(priceData, rsi, sma20),
      ...detectDoubleBottom(priceData),
    ];

    console.log(`Found ${allMatches.length} pattern matches`);

    // Remove duplicates (same pattern on same end date)
    const uniqueMatches = allMatches.reduce((acc, match) => {
      const key = `${match.pattern_type}_${match.end_date}`;
      if (!acc.has(key)) {
        acc.set(key, match);
      }
      return acc;
    }, new Map<string, PatternMatch>());

    const matches = Array.from(uniqueMatches.values());

    // Insert into database
    if (matches.length > 0) {
      const { error: insertError } = await supabase
        .from("pattern_occurrences")
        .upsert(matches, { 
          onConflict: "pattern_type,end_date",
          ignoreDuplicates: true 
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        // Continue anyway, patterns found
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        patterns_found: matches.length,
        patterns: matches.slice(-20), // Return last 20 for preview
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error detecting patterns:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
