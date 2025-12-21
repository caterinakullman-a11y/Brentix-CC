import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Technical indicator calculations
function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const slice = prices.slice(0, period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const multiplier = 2 / (period + 1);
  let ema = prices[prices.length - 1]; // Start with oldest price
  
  for (let i = prices.length - 2; i >= 0; i--) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 0; i < period; i++) {
    const change = prices[i] - prices[i + 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Fetching Brent Crude price from Yahoo Finance...");
    
    // Fetch from Yahoo Finance
    const yahooUrl = "https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1m&range=1d";
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Yahoo Finance response received");

    const result = data.chart?.result?.[0];
    const quote = result?.meta;
    const indicators = result?.indicators?.quote?.[0];

    if (!quote) {
      throw new Error("Invalid Yahoo Finance response: missing quote data");
    }

    const currentPrice = quote.regularMarketPrice;
    const previousClose = quote.previousClose || quote.chartPreviousClose;

    if (!currentPrice) {
      throw new Error("No current price available - market may be closed");
    }

    // Get OHLC from the latest data point, with fallbacks for closed market
    let open = currentPrice;
    let high = currentPrice;
    let low = currentPrice;
    let volume = 0;

    // Check if we have valid indicator data (market open)
    if (indicators?.close && Array.isArray(indicators.close) && indicators.close.length > 0) {
      // Find the last valid (non-null) data point
      let lastValidIndex = -1;
      for (let i = indicators.close.length - 1; i >= 0; i--) {
        if (indicators.close[i] !== null) {
          lastValidIndex = i;
          break;
        }
      }

      if (lastValidIndex >= 0) {
        open = indicators.open?.[lastValidIndex] ?? currentPrice;
        high = indicators.high?.[lastValidIndex] ?? currentPrice;
        low = indicators.low?.[lastValidIndex] ?? currentPrice;
        volume = indicators.volume?.[lastValidIndex] ?? 0;
      }
    }

    const close = currentPrice;

    console.log(`Price data: Open=${open}, High=${high}, Low=${low}, Close=${close}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert price data
    const timestamp = new Date().toISOString();
    const { data: priceData, error: priceError } = await supabase
      .from('price_data')
      .insert({
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        source: 'yahoo'
      })
      .select()
      .single();

    if (priceError) {
      console.error("Error inserting price data:", priceError);
      throw priceError;
    }

    console.log("Price data inserted:", priceData.id);

    // Fetch last 50 prices for indicator calculations
    const { data: historicalPrices, error: histError } = await supabase
      .from('price_data')
      .select('close, timestamp')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (histError) {
      console.error("Error fetching historical prices:", histError);
      throw histError;
    }

    const closePrices = historicalPrices.map(p => Number(p.close));
    console.log(`Calculating indicators from ${closePrices.length} price points`);

    // Calculate technical indicators
    const rsi14 = calculateRSI(closePrices, 14);
    const sma5 = calculateSMA(closePrices, 5);
    const sma10 = calculateSMA(closePrices, 10);
    const sma20 = calculateSMA(closePrices, 20);
    const sma50 = calculateSMA(closePrices, 50);
    const ema12 = calculateEMA(closePrices, 12);
    const ema26 = calculateEMA(closePrices, 26);
    const macd = ema12 && ema26 ? ema12 - ema26 : null;

    // FIX: Calculate MACD Signal Line using historical MACD values, not just current value
    let macdSignal: number | null = null;
    if (macd !== null) {
      // Fetch historical MACD values for proper signal line calculation
      const { data: macdHistory } = await supabase
        .from('technical_indicators')
        .select('macd')
        .order('timestamp', { ascending: false })
        .limit(8);  // Need 8 previous + current = 9 for EMA(9)
      
      const macdValues: number[] = [];
      if (macdHistory && macdHistory.length > 0) {
        // Add historical MACD values (newest first)
        for (const m of macdHistory) {
          if (m.macd !== null) {
            macdValues.push(Number(m.macd));
          }
        }
      }
      // Add current MACD at the beginning (newest)
      macdValues.unshift(macd);
      
      // Calculate EMA(9) of MACD values
      if (macdValues.length >= 9) {
        macdSignal = calculateEMA(macdValues, 9);
        console.log(`MACD Signal calculated from ${macdValues.length} values: ${macdSignal?.toFixed(4)}`);
      } else {
        console.log(`Not enough MACD history for signal line (have ${macdValues.length}, need 9)`);
      }
    }
    
    const macdHistogram = macd && macdSignal ? macd - macdSignal : null;

    // Calculate Bollinger Bands
    const bollingerMiddle = sma20;
    let bollingerUpper = null;
    let bollingerLower = null;
    if (sma20 && closePrices.length >= 20) {
      const slice = closePrices.slice(0, 20);
      const variance = slice.reduce((sum, p) => sum + Math.pow(p - sma20, 2), 0) / 20;
      const stdDev = Math.sqrt(variance);
      bollingerUpper = sma20 + (2 * stdDev);
      bollingerLower = sma20 - (2 * stdDev);
    }

    // Insert technical indicators
    const { error: indicatorError } = await supabase
      .from('technical_indicators')
      .insert({
        price_data_id: priceData.id,
        timestamp,
        rsi_14: rsi14,
        sma_5: sma5,
        sma_10: sma10,
        sma_20: sma20,
        sma_50: sma50,
        ema_12: ema12,
        ema_26: ema26,
        macd,
        macd_signal: macdSignal,
        macd_histogram: macdHistogram,
        bollinger_upper: bollingerUpper,
        bollinger_middle: bollingerMiddle,
        bollinger_lower: bollingerLower
      });

    if (indicatorError) {
      console.error("Error inserting indicators:", indicatorError);
      throw indicatorError;
    }

    console.log("Technical indicators inserted");

    // Generate signals based on conditions
    let signalType: 'BUY' | 'SELL' | 'HOLD' | null = null;
    let strength: 'STRONG' | 'MODERATE' | 'WEAK' = 'WEAK';
    let reasoning = '';
    let probabilityUp = 50;
    let probabilityDown = 50;

    // Only generate signals if we have valid RSI data
    if (rsi14 !== null && rsi14 > 0 && rsi14 < 100 && closePrices.length >= 15) {
      if (rsi14 < 30) {
        signalType = 'BUY';
        strength = rsi14 < 20 ? 'STRONG' : 'MODERATE';
        reasoning = `RSI oversold at ${rsi14.toFixed(1)}`;
        probabilityUp = Math.min(85, 50 + (30 - rsi14) * 1.5);
        probabilityDown = 100 - probabilityUp;
      } else if (rsi14 > 70) {
        signalType = 'SELL';
        strength = rsi14 > 80 ? 'STRONG' : 'MODERATE';
        reasoning = `RSI overbought at ${rsi14.toFixed(1)}`;
        probabilityDown = Math.min(85, 50 + (rsi14 - 70) * 1.5);
        probabilityUp = 100 - probabilityDown;
      }
    } else if (closePrices.length < 15) {
      console.log(`Not enough data for RSI calculation (have ${closePrices.length}, need 15)`);
    }

    // MACD crossover check - now with proper signal line
    if (macd !== null && macdSignal !== null) {
      // Check for crossover by comparing current vs previous
      const { data: prevIndicator } = await supabase
        .from('technical_indicators')
        .select('macd, macd_signal')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevMacd = prevIndicator?.macd ? Number(prevIndicator.macd) : null;
      const prevSignal = prevIndicator?.macd_signal ? Number(prevIndicator.macd_signal) : null;

      // Bullish crossover: MACD crosses above signal line
      if (prevMacd !== null && prevSignal !== null) {
        const wasBelowSignal = prevMacd < prevSignal;
        const isAboveSignal = macd > macdSignal;
        
        if (wasBelowSignal && isAboveSignal) {
          // Bullish crossover detected
          if (signalType === 'BUY') {
            strength = 'STRONG';
            reasoning += '; MACD bullish crossover';
            probabilityUp = Math.min(90, probabilityUp + 10);
            probabilityDown = 100 - probabilityUp;
          } else if (!signalType) {
            signalType = 'BUY';
            strength = 'MODERATE';
            reasoning = 'MACD bullish crossover';
            probabilityUp = 65;
            probabilityDown = 35;
          }
        }

        const wasAboveSignal = prevMacd > prevSignal;
        const isBelowSignal = macd < macdSignal;

        if (wasAboveSignal && isBelowSignal) {
          // Bearish crossover detected
          if (signalType === 'SELL') {
            strength = 'STRONG';
            reasoning += '; MACD bearish crossover';
            probabilityDown = Math.min(90, probabilityDown + 10);
            probabilityUp = 100 - probabilityDown;
          } else if (!signalType) {
            signalType = 'SELL';
            strength = 'MODERATE';
            reasoning = 'MACD bearish crossover';
            probabilityDown = 65;
            probabilityUp = 35;
          }
        }
      }
    }

    // Insert signal if conditions met - using atomic function to prevent race conditions
    if (signalType) {
      const targetPrice = signalType === 'BUY' 
        ? close * 1.01 
        : close * 0.99;
      const stopLoss = signalType === 'BUY'
        ? close * 0.98
        : close * 1.02;

      const { data: signalId, error: signalError } = await supabase
        .rpc('create_signal_atomic', {
          p_signal_type: signalType,
          p_strength: strength,
          p_confidence: Math.max(probabilityUp, probabilityDown),
          p_probability_up: probabilityUp,
          p_probability_down: probabilityDown,
          p_current_price: close,
          p_target_price: targetPrice,
          p_stop_loss: stopLoss,
          p_reasoning: reasoning,
          p_indicators_used: { rsi: rsi14, macd, macdSignal }
        });

      if (signalError) {
        console.error("Error creating signal:", signalError);
        // Fallback to regular insert if atomic function fails
        await supabase
          .from('signals')
          .update({ is_active: false })
          .eq('is_active', true);

        await supabase
          .from('signals')
          .insert({
            timestamp,
            signal_type: signalType,
            strength,
            probability_up: probabilityUp,
            probability_down: probabilityDown,
            confidence: Math.max(probabilityUp, probabilityDown),
            current_price: close,
            target_price: targetPrice,
            stop_loss: stopLoss,
            reasoning,
            is_active: true,
            indicators_used: { rsi: rsi14, macd, macdSignal }
          });
      } else {
        console.log(`Signal generated atomically: ${signalType} (${strength}) - ID: ${signalId}`);

        // Send notifications for STRONG signals
        if (strength === 'STRONG' && signalId) {
          try {
            const notificationResponse = await fetch(
              `${supabaseUrl}/functions/v1/send-signal-notification`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  signalId,
                  signalType,
                  strength,
                  currentPrice: close,
                  targetPrice,
                  stopLoss,
                  confidence: Math.max(probabilityUp, probabilityDown),
                  reasoning,
                }),
              }
            );
            const notifResult = await notificationResponse.json();
            console.log('Signal notification result:', notifResult);
          } catch (notifError) {
            console.error('Failed to send signal notification:', notifError);
            // Don't throw - notification failure shouldn't break the main flow
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      price: close,
      rsi: rsi14,
      macd,
      macdSignal,
      signal: signalType,
      timestamp
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in fetch-brent-price:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
