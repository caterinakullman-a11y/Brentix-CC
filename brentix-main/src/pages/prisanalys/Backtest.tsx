import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useTradingRules } from "@/hooks/useTradingRules";
import { useBacktest } from "@/hooks/prisanalys/usePrisanalysBacktest";
import {
  PlayCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart2,
  Target,
  AlertTriangle,
  DollarSign,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

const PrisanalysBacktest = () => {
  const { rules, isLoading: rulesLoading } = useTradingRules();
  const { runBacktest, isRunning, results, progress } = useBacktest();

  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [initialCapital, setInitialCapital] = useState(100000);

  const handleRunBacktest = async () => {
    if (!selectedRuleId) return;

    const rule = rules.find((r) => r.id === selectedRuleId);
    if (!rule) return;

    await runBacktest({
      rule,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      initialCapital,
    });
  };

  const selectedRule = rules.find((r) => r.id === selectedRuleId);

  // Prepare equity curve data
  const equityCurveData = results?.equityCurve?.map((point, index) => ({
    index,
    equity: point.equity,
    date: point.date ? new Date(point.date).toLocaleDateString("sv-SE") : `Day ${index}`,
  })) ?? [];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Backtest</h1>
          <p className="text-sm text-muted-foreground">
            Testa handelsregler mot historisk data
          </p>
        </div>

        {/* Configuration */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Konfiguration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="rule">Välj regel</Label>
                {rulesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                    <SelectTrigger id="rule">
                      <SelectValue placeholder="Välj en regel..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rules.map((rule) => (
                        <SelectItem key={rule.id} value={rule.id}>
                          <span className="flex items-center gap-2">
                            {rule.rule_type === "BUY" ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            {rule.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label htmlFor="startDate">Från datum</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Till datum</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="capital">Startkapital (SEK)</Label>
                <Input
                  id="capital"
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(parseInt(e.target.value) || 100000)}
                />
              </div>
            </div>

            {selectedRule && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Vald regel: {selectedRule.name}</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={selectedRule.rule_type === "BUY" ? "default" : "destructive"}>
                    {selectedRule.rule_type}
                  </Badge>
                  {(selectedRule.conditions as { type: string }[])?.map((c, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {c.type}
                    </Badge>
                  ))}
                  <Badge variant="outline">SL: {selectedRule.stop_loss_percent}%</Badge>
                  <Badge variant="outline">TP: {selectedRule.take_profit_percent}%</Badge>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleRunBacktest}
                disabled={!selectedRuleId || isRunning}
                size="lg"
              >
                <PlayCircle className="h-5 w-5 mr-2" />
                {isRunning ? "Kör backtest..." : "Kör backtest"}
              </Button>
            </div>

            {isRunning && (
              <div className="mt-4">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-1">
                  Analyserar historisk data... {progress.toFixed(0)}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Nettovinst</span>
                  </div>
                  <p
                    className={cn(
                      "text-2xl font-bold font-mono",
                      results.netProfit >= 0 ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {results.netProfit >= 0 ? "+" : ""}
                    {results.netProfit.toLocaleString("sv-SE")} SEK
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                  </div>
                  <p
                    className={cn(
                      "text-2xl font-bold font-mono",
                      results.winRate >= 50 ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {results.winRate.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Antal trades</span>
                  </div>
                  <p className="text-2xl font-bold font-mono">{results.totalTrades}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-500">{results.winningTrades} vinst</span>
                    {" / "}
                    <span className="text-red-500">{results.losingTrades} förlust</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Max Drawdown</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-red-500">
                    -{results.maxDrawdown.toFixed(2)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Detaljerad statistik</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profit Factor</span>
                      <span
                        className={cn(
                          "font-mono font-medium",
                          results.profitFactor >= 1 ? "text-green-500" : "text-red-500"
                        )}
                      >
                        {results.profitFactor.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Genomsnittlig vinst</span>
                      <span className="font-mono text-green-500">
                        +{results.avgWin?.toFixed(2) ?? 0} SEK
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Genomsnittlig förlust</span>
                      <span className="font-mono text-red-500">
                        -{results.avgLoss?.toFixed(2) ?? 0} SEK
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Största vinst</span>
                      <span className="font-mono text-green-500">
                        +{results.bestTrade?.toFixed(2) ?? 0} SEK
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Största förlust</span>
                      <span className="font-mono text-red-500">
                        {results.worstTrade?.toFixed(2) ?? 0} SEK
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max förlustsvit</span>
                      <span className="font-mono">
                        {results.maxConsecutiveLosses ?? 0} trades
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Avkastning</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Startkapital</span>
                      <span className="font-mono">
                        {initialCapital.toLocaleString("sv-SE")} SEK
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Slutkapital</span>
                      <span className="font-mono">
                        {(initialCapital + results.netProfit).toLocaleString("sv-SE")} SEK
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total avkastning</span>
                      <span
                        className={cn(
                          "font-mono font-medium",
                          results.netProfit >= 0 ? "text-green-500" : "text-red-500"
                        )}
                      >
                        {((results.netProfit / initialCapital) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sharpe Ratio</span>
                      <span className="font-mono">
                        {results.sharpeRatio?.toFixed(2) ?? "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Risk/Reward</span>
                      <span className="font-mono">
                        1:{((results.avgWin ?? 0) / (results.avgLoss ?? 1)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Equity Curve */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart2 className="h-5 w-5" />
                  Equity Curve
                </CardTitle>
              </CardHeader>
              <CardContent>
                {equityCurveData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={equityCurveData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) =>
                            `${(value / 1000).toFixed(0)}k`
                          }
                        />
                        <ReferenceLine
                          y={initialCapital}
                          stroke="hsl(var(--muted-foreground))"
                          strokeDasharray="3 3"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [
                            `${value.toLocaleString("sv-SE")} SEK`,
                            "Kapital",
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="equity"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Ingen equity data tillgänglig
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trade Log */}
            {results.trades && results.trades.length > 0 && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Trade Log (senaste 10)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2">Datum</th>
                          <th className="text-left py-2">Typ</th>
                          <th className="text-right py-2">Entry</th>
                          <th className="text-right py-2">Exit</th>
                          <th className="text-right py-2">P/L</th>
                          <th className="text-right py-2">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.trades.slice(-10).map((trade, index) => (
                          <tr key={index} className="border-b border-border/50">
                            <td className="py-2 font-mono text-xs">
                              {trade.entryDate
                                ? new Date(trade.entryDate).toLocaleDateString("sv-SE")
                                : "-"}
                            </td>
                            <td className="py-2">
                              <Badge
                                variant={trade.type === "BUY" ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {trade.type}
                              </Badge>
                            </td>
                            <td className="py-2 text-right font-mono">
                              ${trade.entryPrice?.toFixed(2)}
                            </td>
                            <td className="py-2 text-right font-mono">
                              ${trade.exitPrice?.toFixed(2)}
                            </td>
                            <td
                              className={cn(
                                "py-2 text-right font-mono",
                                trade.profit >= 0 ? "text-green-500" : "text-red-500"
                              )}
                            >
                              {trade.profit >= 0 ? "+" : ""}
                              {trade.profit?.toFixed(2)}
                            </td>
                            <td
                              className={cn(
                                "py-2 text-right font-mono",
                                trade.profitPercent >= 0 ? "text-green-500" : "text-red-500"
                              )}
                            >
                              {trade.profitPercent >= 0 ? "+" : ""}
                              {trade.profitPercent?.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* No Results State */}
        {!results && !isRunning && (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <PlayCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Kör en backtest</h3>
              <p className="text-muted-foreground text-center">
                Välj en regel och tidsperiod ovan för att se hur strategin hade presterat
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default PrisanalysBacktest;
