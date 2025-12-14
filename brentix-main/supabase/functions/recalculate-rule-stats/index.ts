import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradeSnapshot {
  id: string;
  trade_id: string;
  trade_type: string;
  active_rule_ids: string[];
  rule_names: string[];
  rule_conditions: any;
  triggered_rule_ids: string[] | null;
  profit_loss_sek: number | null;
  profit_loss_percent: number | null;
  hold_duration_seconds: number | null;
  created_at: string;
}

interface RuleStatsAccumulator {
  ruleId: string;
  ruleName: string;
  trades: TradeSnapshot[];
}

function calculateRuleStats(trades: TradeSnapshot[]) {
  const completedTrades = trades.filter(t => t.profit_loss_sek !== null);
  
  if (completedTrades.length === 0) {
    return {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: 0,
      total_profit_loss_sek: 0,
      avg_profit_per_trade: 0,
      avg_loss_per_trade: 0,
      profit_factor: 0,
      best_trade_sek: 0,
      worst_trade_sek: 0,
      avg_hold_duration_seconds: 0,
      first_trade_at: null,
      last_trade_at: null,
      performance_score: 0,
    };
  }

  const winningTrades = completedTrades.filter(t => (t.profit_loss_sek || 0) > 0);
  const losingTrades = completedTrades.filter(t => (t.profit_loss_sek || 0) < 0);
  
  const totalProfitLoss = completedTrades.reduce((sum, t) => sum + (t.profit_loss_sek || 0), 0);
  const grossProfit = winningTrades.reduce((sum, t) => sum + (t.profit_loss_sek || 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit_loss_sek || 0), 0));
  
  const avgProfit = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
  
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
  const winRate = (winningTrades.length / completedTrades.length) * 100;
  
  const profitLosses = completedTrades.map(t => t.profit_loss_sek || 0);
  const bestTrade = Math.max(...profitLosses);
  const worstTrade = Math.min(...profitLosses);
  
  const holdDurations = completedTrades.map(t => t.hold_duration_seconds || 0).filter(d => d > 0);
  const avgHoldDuration = holdDurations.length > 0 
    ? Math.round(holdDurations.reduce((a, b) => a + b, 0) / holdDurations.length)
    : 0;

  const timestamps = completedTrades.map(t => new Date(t.created_at).getTime());
  const firstTradeAt = new Date(Math.min(...timestamps)).toISOString();
  const lastTradeAt = new Date(Math.max(...timestamps)).toISOString();

  // Performance score: 0-100 based on win rate, profit factor, and sample size
  const sampleSizeBonus = Math.min(20, completedTrades.length);
  const winRateScore = Math.min(40, winRate * 0.5);
  const profitFactorScore = Math.min(40, profitFactor * 20);
  const performanceScore = Math.round(sampleSizeBonus + winRateScore + profitFactorScore);

  return {
    total_trades: completedTrades.length,
    winning_trades: winningTrades.length,
    losing_trades: losingTrades.length,
    win_rate: winRate,
    total_profit_loss_sek: totalProfitLoss,
    avg_profit_per_trade: avgProfit,
    avg_loss_per_trade: avgLoss,
    profit_factor: profitFactor,
    best_trade_sek: bestTrade,
    worst_trade_sek: worstTrade,
    avg_hold_duration_seconds: avgHoldDuration,
    first_trade_at: firstTradeAt,
    last_trade_at: lastTradeAt,
    performance_score: Math.min(100, performanceScore),
  };
}

function hashCombination(ruleIds: string[]): string {
  const sorted = [...ruleIds].sort().join(",");
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Validate JWT and get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    console.log(`[recalculate-rule-stats] Starting for user: ${userId}`);

    // Fetch all trade snapshots with completed P/L
    const { data: snapshots, error: snapshotError } = await supabase
      .from("trade_rule_snapshot")
      .select("*")
      .not("profit_loss_sek", "is", null);

    if (snapshotError) throw snapshotError;

    // Filter to user's trades by checking paper_trades and trades
    const { data: paperTrades } = await supabase
      .from("paper_trades")
      .select("id")
      .eq("user_id", userId);

    const { data: liveTrades } = await supabase
      .from("trades")
      .select("id")
      .eq("user_id", userId);

    const userTradeIds = new Set([
      ...(paperTrades || []).map(t => t.id),
      ...(liveTrades || []).map(t => t.id)
    ]);

    const userSnapshots = (snapshots || []).filter(s => userTradeIds.has(s.trade_id));

    console.log(`[recalculate-rule-stats] Found ${userSnapshots.length} trade snapshots for user`);

    if (userSnapshots.length === 0) {
      return new Response(
        JSON.stringify({ message: "No trades to analyze", stats: 0, recommendations: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // 1. CALCULATE STATS PER INDIVIDUAL RULE
    // ============================================
    const ruleStats = new Map<string, RuleStatsAccumulator>();

    userSnapshots.forEach(snapshot => {
      (snapshot.active_rule_ids || []).forEach((ruleId: string, index: number) => {
        if (!ruleStats.has(ruleId)) {
          ruleStats.set(ruleId, {
            ruleId,
            ruleName: snapshot.rule_names?.[index] || "Unknown",
            trades: [],
          });
        }
        ruleStats.get(ruleId)!.trades.push(snapshot);
      });
    });

    // Save per-rule stats
    for (const [ruleId, stats] of ruleStats) {
      const calculated = calculateRuleStats(stats.trades);
      
      const { error: upsertError } = await supabase
        .from("rule_performance_stats")
        .upsert({
          user_id: userId,
          rule_id: ruleId,
          rule_name: stats.ruleName,
          ...calculated,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,rule_id",
        });

      if (upsertError) {
        console.error(`Error upserting rule stats for ${ruleId}:`, upsertError);
      }
    }

    console.log(`[recalculate-rule-stats] Saved stats for ${ruleStats.size} rules`);

    // ============================================
    // 2. CALCULATE STATS PER RULE COMBINATION
    // ============================================
    const combinationStats = new Map<string, {
      hash: string;
      ruleIds: string[];
      ruleNames: string[];
      trades: TradeSnapshot[];
    }>();

    userSnapshots.forEach(snapshot => {
      const sortedRuleIds = [...(snapshot.active_rule_ids || [])].sort();
      if (sortedRuleIds.length === 0) return;
      
      const hash = hashCombination(sortedRuleIds);

      if (!combinationStats.has(hash)) {
        combinationStats.set(hash, {
          hash,
          ruleIds: sortedRuleIds,
          ruleNames: snapshot.rule_names || [],
          trades: [],
        });
      }
      combinationStats.get(hash)!.trades.push(snapshot);
    });

    // Calculate baseline (trades without rules)
    const baselineTrades = userSnapshots.filter(s => (s.active_rule_ids || []).length === 0);
    const baselineStats = calculateRuleStats(baselineTrades);
    const baselineWinRate = baselineStats.win_rate || 50;

    // Save combination stats
    for (const [hash, combo] of combinationStats) {
      const calculated = calculateRuleStats(combo.trades);
      const improvement = calculated.win_rate - baselineWinRate;
      const sampleSufficient = combo.trades.length >= 10;
      const confidenceLevel = Math.min(95, 50 + combo.trades.length * 2);

      const { error: upsertError } = await supabase
        .from("rule_combination_stats")
        .upsert({
          user_id: userId,
          rule_ids: combo.ruleIds,
          rule_names: combo.ruleNames,
          combination_hash: hash,
          total_trades: calculated.total_trades,
          winning_trades: calculated.winning_trades,
          win_rate: calculated.win_rate,
          total_profit_loss_sek: calculated.total_profit_loss_sek,
          avg_profit_per_trade: calculated.avg_profit_per_trade,
          profit_factor: calculated.profit_factor,
          improvement_vs_baseline_percent: improvement,
          combination_score: calculated.performance_score,
          sample_size_sufficient: sampleSufficient,
          confidence_level: confidenceLevel,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,combination_hash",
        });

      if (upsertError) {
        console.error(`Error upserting combination stats for ${hash}:`, upsertError);
      }
    }

    console.log(`[recalculate-rule-stats] Saved stats for ${combinationStats.size} combinations`);

    // ============================================
    // 3. GENERATE RECOMMENDATIONS
    // ============================================
    const recommendations: any[] = [];

    // Get current active rules
    const { data: activeRules } = await supabase
      .from("trading_rules")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true);

    const activeRuleIds = new Set((activeRules || []).map(r => r.id));

    // Find underperforming active rules (recommend disable)
    for (const [ruleId, stats] of ruleStats) {
      const calculated = calculateRuleStats(stats.trades);
      
      if (activeRuleIds.has(ruleId) && calculated.total_trades >= 5 && calculated.win_rate < 40) {
        recommendations.push({
          user_id: userId,
          recommendation_type: "disable_rule",
          rule_id: ruleId,
          reasoning: `Regeln "${stats.ruleName}" har bara ${calculated.win_rate.toFixed(1)}% vinster över ${calculated.total_trades} trades. Överväg att avaktivera den.`,
          expected_improvement_percent: Math.abs(calculated.win_rate - 50),
          confidence_score: Math.min(90, 50 + calculated.total_trades * 2),
          supporting_data: {
            trades_analyzed: calculated.total_trades,
            win_rate: calculated.win_rate,
            profit_factor: calculated.profit_factor,
            total_profit: calculated.total_profit_loss_sek,
          },
        });
      }

      // Find high-performing inactive rules (recommend enable)
      if (!activeRuleIds.has(ruleId) && calculated.total_trades >= 5 && calculated.win_rate > 60) {
        recommendations.push({
          user_id: userId,
          recommendation_type: "enable_rule",
          rule_id: ruleId,
          reasoning: `Regeln "${stats.ruleName}" har gett ${calculated.win_rate.toFixed(1)}% vinster historiskt. Den är för närvarande inaktiv.`,
          expected_improvement_percent: calculated.win_rate - 50,
          confidence_score: Math.min(90, 50 + calculated.total_trades * 2),
          supporting_data: {
            trades_analyzed: calculated.total_trades,
            win_rate: calculated.win_rate,
            profit_factor: calculated.profit_factor,
            total_profit: calculated.total_profit_loss_sek,
          },
        });
      }
    }

    // Find best combinations not currently in use
    const sortedCombinations = Array.from(combinationStats.values())
      .filter(c => c.trades.length >= 10)
      .map(c => ({ ...c, calculated: calculateRuleStats(c.trades) }))
      .sort((a, b) => b.calculated.performance_score - a.calculated.performance_score);

    const currentActiveHash = hashCombination([...activeRuleIds]);
    
    const bestUnusedCombinations = sortedCombinations
      .filter(c => c.hash !== currentActiveHash)
      .slice(0, 3);

    for (const combo of bestUnusedCombinations) {
      if (combo.calculated.win_rate > 55 && combo.calculated.profit_factor > 1.2) {
        recommendations.push({
          user_id: userId,
          recommendation_type: "try_combination",
          rule_ids: combo.ruleIds,
          reasoning: `Kombinationen av ${combo.ruleNames.join(" + ")} har gett ${combo.calculated.win_rate.toFixed(1)}% vinster över ${combo.trades.length} trades.`,
          expected_improvement_percent: combo.calculated.win_rate - baselineWinRate,
          confidence_score: Math.min(90, combo.calculated.performance_score),
          supporting_data: {
            trades_analyzed: combo.trades.length,
            win_rate: combo.calculated.win_rate,
            profit_factor: combo.calculated.profit_factor,
            total_profit: combo.calculated.total_profit_loss_sek,
            rules_in_combination: combo.ruleNames,
          },
        });
      }
    }

    // Remove old pending recommendations and insert new ones
    await supabase
      .from("rule_recommendations")
      .delete()
      .eq("user_id", userId)
      .eq("status", "pending");

    if (recommendations.length > 0) {
      const { error: insertError } = await supabase
        .from("rule_recommendations")
        .insert(recommendations);

      if (insertError) {
        console.error("Error inserting recommendations:", insertError);
      }
    }

    console.log(`[recalculate-rule-stats] Generated ${recommendations.length} recommendations`);

    return new Response(
      JSON.stringify({
        message: "Rule stats calculated successfully",
        stats: ruleStats.size,
        combinations: combinationStats.size,
        recommendations: recommendations.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("[recalculate-rule-stats] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});