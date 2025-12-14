import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit2, TrendingUp, TrendingDown, Sparkles, PlayCircle, Loader2, ChevronDown, ChevronUp, History } from "lucide-react";
import { TradingRule, useToggleRule, useDeleteRule } from "@/hooks/useTradingRules";
import { useRunRuleBacktest, useBacktestHistory } from "@/hooks/useRuleBacktest";
import { BacktestResultsInline } from "./BacktestResultsInline";
import { EquityCurveChart } from "./EquityCurveChart";
import { toast } from "sonner";

interface RuleCardProps {
  rule: TradingRule;
  onEdit: (rule: TradingRule) => void;
}

export function RuleCard({ rule, onEdit }: RuleCardProps) {
  const [showChart, setShowChart] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const toggleRule = useToggleRule();
  const deleteRule = useDeleteRule();
  const runBacktest = useRunRuleBacktest();
  
  const { data: backtestHistory } = useBacktestHistory(rule.id);
  const latestBacktest = backtestHistory?.[0];

  const handleToggle = async (checked: boolean) => {
    try {
      await toggleRule.mutateAsync({ id: rule.id, is_active: checked });
      toast.success(checked ? "Regel aktiverad" : "Regel pausad");
    } catch {
      toast.error("Kunde inte uppdatera regel");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Vill du ta bort denna regel?")) return;
    try {
      await deleteRule.mutateAsync(rule.id);
      toast.success("Regel borttagen");
    } catch {
      toast.error("Kunde inte ta bort regel");
    }
  };

  const handleBacktest = async () => {
    try {
      const result = await runBacktest.mutateAsync({ rule });
      toast.success(`Backtest klar: ${result.summary.winRate.toFixed(1)}% win rate, ${result.summary.totalTrades} trades`);
      setShowChart(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunde inte köra backtest");
    }
  };

  const getConditionSummary = () => {
    return rule.conditions.map((c) => {
      switch (c.type) {
        case "price_change":
          return `Pris ${c.direction === "up" ? "↑" : c.direction === "down" ? "↓" : "↔"} ${c.min_percent}%`;
        case "rsi":
          return `RSI ${c.operator} ${c.value}`;
        case "macd":
          return `MACD ${c.condition}`;
        default:
          return c.type;
      }
    }).join(` ${rule.logic_operator} `);
  };

  // Prepare equity curve data from latest backtest
  const equityCurveData = latestBacktest?.equity_curve?.map((point: { timestamp: string; equity: number }) => ({
    date: new Date(point.timestamp).toLocaleDateString(),
    equity: point.equity,
  })) || [];

  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {rule.is_system_suggested && (
                <Sparkles className="h-4 w-4 text-amber-500" />
              )}
              <h3 className="font-medium text-foreground truncate">{rule.name}</h3>
              <Badge 
                variant="outline" 
                className={
                  rule.rule_type === "BUY" 
                    ? "border-[#5B9A6F] text-[#5B9A6F]" 
                    : rule.rule_type === "SELL"
                    ? "border-[#9A5B5B] text-[#9A5B5B]"
                    : "border-muted-foreground text-muted-foreground"
                }
              >
                {rule.rule_type}
              </Badge>
            </div>
            
            {rule.description && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                {rule.description}
              </p>
            )}
            
            <div className="text-xs text-muted-foreground font-mono mb-2">
              OM: {getConditionSummary()} → {rule.action_config.instrument}
            </div>

            {/* Show latest backtest results inline */}
            {latestBacktest && (
              <div className="space-y-2">
                <BacktestResultsInline 
                  summary={{
                    totalProfitLoss: latestBacktest.total_profit_loss_sek,
                    totalProfitLossPercent: latestBacktest.total_profit_loss_percent,
                    winRate: latestBacktest.win_rate,
                    totalTrades: latestBacktest.total_trades,
                    profitFactor: latestBacktest.profit_factor || 0,
                    maxDrawdownPercent: latestBacktest.max_drawdown_percent || 0,
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowChart(!showChart)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {showChart ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Graf
                  </button>
                  {backtestHistory && backtestHistory.length > 1 && (
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <History className="h-3 w-3" />
                      {backtestHistory.length} tester
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Fallback to old backtest_results if no new results */}
            {!latestBacktest && rule.backtest_results && (
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  {rule.backtest_results.win_rate >= 50 ? (
                    <TrendingUp className="h-3 w-3 text-[#5B9A6F]" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-[#9A5B5B]" />
                  )}
                  <span className={rule.backtest_results.win_rate >= 50 ? "text-[#5B9A6F]" : "text-[#9A5B5B]"}>
                    {rule.backtest_results.win_rate.toFixed(1)}% win
                  </span>
                </span>
                <span className="text-muted-foreground">
                  {rule.backtest_results.trades} trades
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handleBacktest}
              disabled={runBacktest.isPending}
            >
              {runBacktest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-1" />
                  Backtest
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(rule)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Switch
              checked={rule.is_active}
              onCheckedChange={handleToggle}
              disabled={toggleRule.isPending}
            />
          </div>
        </div>

        {/* Equity Curve Chart */}
        {showChart && equityCurveData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <EquityCurveChart data={equityCurveData} initialCapital={latestBacktest?.initial_capital_sek || 100000} />
          </div>
        )}

        {/* Backtest History */}
        {showHistory && backtestHistory && backtestHistory.length > 1 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Tidigare tester</h4>
            <div className="space-y-2">
              {backtestHistory.slice(1, 5).map((bt) => (
                <div key={bt.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {new Date(bt.created_at).toLocaleDateString()}
                  </span>
                  <span className={bt.total_profit_loss_sek >= 0 ? "text-[#5B9A6F]" : "text-[#9A5B5B]"}>
                    {bt.win_rate.toFixed(1)}% win, {bt.total_profit_loss_sek >= 0 ? "+" : ""}{bt.total_profit_loss_sek.toFixed(0)} SEK
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
