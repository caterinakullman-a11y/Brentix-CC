import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RuleCondition {
  indicator: string;
  operator: string;
  value: number | string;
}

interface BacktestRequest {
  userId: string;
  ruleId?: string;
  ruleName: string;
  conditions: RuleCondition[];
  action: 'BUY' | 'SELL';
  periodStart: string;
  periodEnd: string;
  initialCapital: number;
  positionSize: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
}

interface SimulatedTrade {
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  direction: 'BUY' | 'SELL';
  sizeSek: number;
  profitLossSek: number;
  profitLossPercent: number;
  holdDurationSeconds: number;
  exitReason: string;
}

interface OpenPosition {
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  entryTime: string;
  sizeSek: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  try {
    // Validate JWT and get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const request: BacktestRequest = await req.json();
    
    // Override userId with authenticated user to prevent spoofing
    request.userId = user.id;
    
    console.log('Backtest request:', { ruleName: request.ruleName, period: `${request.periodStart} to ${request.periodEnd}`, userId: user.id });
    
    // Fetch price data
    const { data: priceData, error: priceError } = await supabase
      .from("price_data")
      .select("*")
      .gte("timestamp", request.periodStart)
      .lte("timestamp", request.periodEnd)
      .order("timestamp", { ascending: true });
    
    if (priceError) throw priceError;
    if (!priceData?.length) {
      throw new Error("Ingen historisk data tillgänglig för vald period");
    }
    
    console.log(`Fetched ${priceData.length} price data points`);
    
    // Fetch technical indicators
    const { data: indicators } = await supabase
      .from("technical_indicators")
      .select("*")
      .gte("timestamp", request.periodStart)
      .lte("timestamp", request.periodEnd)
      .order("timestamp", { ascending: true });
    
    const indicatorMap = new Map(
      indicators?.map(i => [i.timestamp, i]) || []
    );
    
    // Simulate trades
    const simulatedTrades: SimulatedTrade[] = [];
    let equity = request.initialCapital;
    let position: OpenPosition | null = null;
    const equityCurve: { timestamp: string; equity: number; drawdown: number }[] = [];
    let maxEquity = equity;
    let maxDrawdown = 0;
    
    for (let i = 1; i < priceData.length; i++) {
      const currentPrice = priceData[i];
      const previousPrice = priceData[i - 1];
      const currentIndicators = indicatorMap.get(currentPrice.timestamp);
      const previousIndicators = indicatorMap.get(previousPrice.timestamp);
      
      const conditionsMet = evaluateConditions(
        request.conditions,
        currentPrice,
        previousPrice,
        currentIndicators,
        previousIndicators
      );
      
      // Handle open position
      if (position) {
        const currentPriceValue = currentPrice.close;
        const priceChange = position.direction === 'BUY' 
          ? (currentPriceValue - position.entryPrice) / position.entryPrice
          : (position.entryPrice - currentPriceValue) / position.entryPrice;
        
        let shouldClose = false;
        let exitReason = 'signal';
        let exitPrice = currentPriceValue;
        
        // Check stop-loss
        if (request.stopLossPercent && priceChange <= -request.stopLossPercent / 100) {
          shouldClose = true;
          exitReason = 'stop_loss';
          exitPrice = position.entryPrice * (1 - request.stopLossPercent / 100);
        }
        
        // Check take-profit
        if (!shouldClose && request.takeProfitPercent && priceChange >= request.takeProfitPercent / 100) {
          shouldClose = true;
          exitReason = 'take_profit';
          exitPrice = position.entryPrice * (1 + request.takeProfitPercent / 100);
        }
        
        // Check opposite signal
        if (!shouldClose && conditionsMet && request.action !== position.direction) {
          shouldClose = true;
          exitReason = 'opposite_signal';
        }
        
        if (shouldClose) {
          const profitLoss = position.direction === 'BUY'
            ? (exitPrice - position.entryPrice) / position.entryPrice
            : (position.entryPrice - exitPrice) / position.entryPrice;
          
          const profitLossSek = profitLoss * position.sizeSek;
          const holdDuration = Math.floor(
            (new Date(currentPrice.timestamp).getTime() - new Date(position.entryTime).getTime()) / 1000
          );
          
          simulatedTrades.push({
            entryTime: position.entryTime,
            exitTime: currentPrice.timestamp,
            entryPrice: position.entryPrice,
            exitPrice,
            direction: position.direction,
            sizeSek: position.sizeSek,
            profitLossSek,
            profitLossPercent: profitLoss * 100,
            holdDurationSeconds: holdDuration,
            exitReason,
          });
          
          equity += profitLossSek;
          position = null;
        }
      }
      
      // Open new position
      if (!position && conditionsMet) {
        position = {
          direction: request.action,
          entryPrice: currentPrice.close,
          entryTime: currentPrice.timestamp,
          sizeSek: Math.min(request.positionSize, equity * 0.1), // Max 10% of equity
        };
      }
      
      // Update equity curve (every 10th point)
      if (i % 10 === 0) {
        const unrealizedPnL = position
          ? ((currentPrice.close - position.entryPrice) / position.entryPrice) * position.sizeSek * (position.direction === 'BUY' ? 1 : -1)
          : 0;
        
        const currentEquity = equity + unrealizedPnL;
        maxEquity = Math.max(maxEquity, currentEquity);
        const drawdown = maxEquity - currentEquity;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
        
        equityCurve.push({
          timestamp: currentPrice.timestamp,
          equity: currentEquity,
          drawdown,
        });
      }
    }
    
    // Close any remaining position
    if (position && priceData.length > 0) {
      const lastPrice = priceData[priceData.length - 1];
      const profitLoss = position.direction === 'BUY'
        ? (lastPrice.close - position.entryPrice) / position.entryPrice
        : (position.entryPrice - lastPrice.close) / position.entryPrice;
      
      const profitLossSek = profitLoss * position.sizeSek;
      const holdDuration = Math.floor(
        (new Date(lastPrice.timestamp).getTime() - new Date(position.entryTime).getTime()) / 1000
      );
      
      simulatedTrades.push({
        entryTime: position.entryTime,
        exitTime: lastPrice.timestamp,
        entryPrice: position.entryPrice,
        exitPrice: lastPrice.close,
        direction: position.direction,
        sizeSek: position.sizeSek,
        profitLossSek,
        profitLossPercent: profitLoss * 100,
        holdDurationSeconds: holdDuration,
        exitReason: 'end_of_period',
      });
      
      equity += profitLossSek;
    }
    
    // Calculate statistics
    const winners = simulatedTrades.filter(t => t.profitLossSek > 0);
    const losers = simulatedTrades.filter(t => t.profitLossSek < 0);
    
    const grossProfit = winners.reduce((sum, t) => sum + t.profitLossSek, 0);
    const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.profitLossSek, 0));
    
    const totalProfitLoss = equity - request.initialCapital;
    const totalProfitLossPercent = (totalProfitLoss / request.initialCapital) * 100;
    
    const results = {
      total_trades: simulatedTrades.length,
      winning_trades: winners.length,
      losing_trades: losers.length,
      win_rate: simulatedTrades.length > 0 ? (winners.length / simulatedTrades.length) * 100 : 0,
      total_profit_loss_sek: totalProfitLoss,
      total_profit_loss_percent: totalProfitLossPercent,
      gross_profit_sek: grossProfit,
      gross_loss_sek: grossLoss,
      profit_factor: grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0),
      best_trade_sek: simulatedTrades.length > 0 ? Math.max(...simulatedTrades.map(t => t.profitLossSek)) : 0,
      worst_trade_sek: simulatedTrades.length > 0 ? Math.min(...simulatedTrades.map(t => t.profitLossSek)) : 0,
      avg_trade_sek: simulatedTrades.length > 0 ? totalProfitLoss / simulatedTrades.length : 0,
      max_drawdown_sek: maxDrawdown,
      max_drawdown_percent: maxEquity > 0 ? (maxDrawdown / maxEquity) * 100 : 0,
      avg_hold_duration_seconds: simulatedTrades.length > 0
        ? Math.round(simulatedTrades.reduce((sum, t) => sum + t.holdDurationSeconds, 0) / simulatedTrades.length)
        : 0,
    };
    
    console.log('Backtest results:', { trades: results.total_trades, winRate: results.win_rate, profit: results.total_profit_loss_sek });
    
    // Save results
    const { data: savedResult, error: saveError } = await supabase
      .from("rule_backtest_results")
      .insert({
        user_id: request.userId,
        rule_id: request.ruleId,
        rule_name: request.ruleName,
        rule_conditions: request.conditions,
        test_period_start: request.periodStart,
        test_period_end: request.periodEnd,
        initial_capital_sek: request.initialCapital,
        position_size_sek: request.positionSize,
        ...results,
        simulated_trades: simulatedTrades,
        equity_curve: equityCurve,
        calculation_time_ms: Date.now() - startTime,
        data_points_analyzed: priceData.length,
        status: 'completed',
      })
      .select()
      .single();
    
    if (saveError) {
      console.error('Save error:', saveError);
      throw saveError;
    }
    
    // Update trading_rules with backtest results
    if (request.ruleId) {
      await supabase
        .from("trading_rules")
        .update({
          backtest_results: {
            lastRun: new Date().toISOString(),
            totalTrades: results.total_trades,
            winRate: results.win_rate,
            profitLoss: results.total_profit_loss_sek,
            profitLossPercent: results.total_profit_loss_percent,
            profitFactor: results.profit_factor,
            maxDrawdown: results.max_drawdown_percent,
          },
        })
        .eq("id", request.ruleId);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        backtestId: savedResult.id,
        summary: {
          totalProfitLoss: totalProfitLoss,
          totalProfitLossPercent: totalProfitLossPercent,
          winRate: results.win_rate,
          totalTrades: results.total_trades,
          profitFactor: results.profit_factor,
          maxDrawdownPercent: results.max_drawdown_percent,
        },
        fullResults: savedResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: unknown) {
    console.error("Backtest error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function evaluateConditions(
  conditions: RuleCondition[],
  currentPrice: any,
  previousPrice: any,
  currentIndicators: any,
  previousIndicators: any
): boolean {
  if (!currentIndicators || conditions.length === 0) return false;
  
  return conditions.every(condition => {
    const currentValue = getIndicatorValue(condition.indicator, currentIndicators, currentPrice);
    const previousValue = previousIndicators ? getIndicatorValue(condition.indicator, previousIndicators, previousPrice) : currentValue;
    const targetValue = getTargetValue(condition.value, currentIndicators);
    
    if (currentValue === null || targetValue === null) return false;
    
    switch (condition.operator) {
      case '<': case 'LESS_THAN': return currentValue < targetValue;
      case '>': case 'GREATER_THAN': return currentValue > targetValue;
      case '<=': return currentValue <= targetValue;
      case '>=': return currentValue >= targetValue;
      case '==': case 'EQUALS': return Math.abs(currentValue - targetValue) < 0.01;
      case 'crosses_above': case 'CROSSES_ABOVE':
        return previousValue !== null && previousValue <= targetValue && currentValue > targetValue;
      case 'crosses_below': case 'CROSSES_BELOW':
        return previousValue !== null && previousValue >= targetValue && currentValue < targetValue;
      default:
        return false;
    }
  });
}

function getIndicatorValue(indicator: string, indicators: any, price: any): number | null {
  const ind = indicator.toUpperCase();
  switch (ind) {
    case 'RSI': case 'RSI_14': return indicators?.rsi_14 ?? null;
    case 'MACD': return indicators?.macd ?? null;
    case 'MACD_SIGNAL': return indicators?.macd_signal ?? null;
    case 'MACD_HISTOGRAM': return indicators?.macd_histogram ?? null;
    case 'PRICE': case 'CLOSE': return price?.close ?? null;
    case 'SMA_5': return indicators?.sma_5 ?? price?.close;
    case 'SMA_10': return indicators?.sma_10 ?? price?.close;
    case 'SMA_20': return indicators?.sma_20 ?? price?.close;
    case 'SMA_50': return indicators?.sma_50 ?? price?.close;
    case 'EMA_12': return indicators?.ema_12 ?? price?.close;
    case 'EMA_26': return indicators?.ema_26 ?? price?.close;
    case 'BOLLINGER_UPPER': return indicators?.bollinger_upper ?? null;
    case 'BOLLINGER_LOWER': return indicators?.bollinger_lower ?? null;
    case 'BOLLINGER_MIDDLE': return indicators?.bollinger_middle ?? null;
    case 'VOLUME': return price?.volume ?? null;
    case 'ATR': case 'ATR_14': return indicators?.atr_14 ?? null;
    default: return null;
  }
}

function getTargetValue(value: number | string, indicators: any): number | null {
  if (typeof value === 'number') return value;
  
  const val = String(value).toLowerCase();
  switch (val) {
    case 'signal_line': return indicators?.macd_signal ?? null;
    case 'upper_band': return indicators?.bollinger_upper ?? null;
    case 'lower_band': return indicators?.bollinger_lower ?? null;
    case 'middle_band': return indicators?.bollinger_middle ?? null;
    case 'sma_20': return indicators?.sma_20 ?? null;
    case 'sma_50': return indicators?.sma_50 ?? null;
    default: return parseFloat(val) || null;
  }
}
