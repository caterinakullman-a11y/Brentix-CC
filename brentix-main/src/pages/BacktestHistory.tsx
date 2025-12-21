import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  TestTube,
  TrendingUp,
  TrendingDown,
  Search,
  Calendar,
  BarChart3,
  ArrowUpDown,
  Eye,
  Clock,
  Target,
  Percent,
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAllBacktestHistory, BacktestResult } from "@/hooks/useRuleBacktest";

type SortField = "date" | "profit" | "winrate" | "trades";
type SortOrder = "asc" | "desc";

const BacktestHistory = () => {
  const { data: backtestHistory, isLoading } = useAllBacktestHistory();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedResult, setSelectedResult] = useState<BacktestResult | null>(null);

  const filteredAndSortedResults = useMemo(() => {
    if (!backtestHistory) return [];

    let results = [...backtestHistory];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(r =>
        r.rule_name.toLowerCase().includes(query)
      );
    }

    // Sort
    results.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "date":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "profit":
          comparison = a.total_profit_loss_percent - b.total_profit_loss_percent;
          break;
        case "winrate":
          comparison = a.win_rate - b.win_rate;
          break;
        case "trades":
          comparison = a.total_trades - b.total_trades;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return results;
  }, [backtestHistory, searchQuery, sortField, sortOrder]);

  // Calculate aggregated statistics
  const aggregatedStats = useMemo(() => {
    if (!backtestHistory || backtestHistory.length === 0) return null;

    const totalTests = backtestHistory.length;
    const profitableTests = backtestHistory.filter(r => r.total_profit_loss_percent > 0).length;
    const avgWinRate = backtestHistory.reduce((sum, r) => sum + r.win_rate, 0) / totalTests;
    const avgProfitFactor = backtestHistory
      .filter(r => r.profit_factor !== null)
      .reduce((sum, r) => sum + (r.profit_factor || 0), 0) / totalTests;
    const bestResult = Math.max(...backtestHistory.map(r => r.total_profit_loss_percent));
    const worstResult = Math.min(...backtestHistory.map(r => r.total_profit_loss_percent));

    return {
      totalTests,
      profitableTests,
      profitablePercent: (profitableTests / totalTests) * 100,
      avgWinRate,
      avgProfitFactor,
      bestResult,
      worstResult,
    };
  }, [backtestHistory]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TestTube className="h-6 w-6 text-primary" />
            Backtest-historik
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jämför och analysera tidigare backtest-körningar
          </p>
        </div>

        {/* Aggregated Statistics */}
        {aggregatedStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Totalt tester</p>
                <p className="text-xl font-bold">{aggregatedStats.totalTests}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Lönsamma</p>
                <p className="text-xl font-bold text-primary">
                  {aggregatedStats.profitablePercent.toFixed(0)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Snitt Win Rate</p>
                <p className="text-xl font-bold">{aggregatedStats.avgWinRate.toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Snitt PF</p>
                <p className="text-xl font-bold">{aggregatedStats.avgProfitFactor.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Bästa resultat</p>
                <p className="text-xl font-bold text-green-500">
                  +{aggregatedStats.bestResult.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Sämsta resultat</p>
                <p className="text-xl font-bold text-red-500">
                  {aggregatedStats.worstResult.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök på regelnamn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sortera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Datum</SelectItem>
              <SelectItem value="profit">Avkastning</SelectItem>
              <SelectItem value="winrate">Win Rate</SelectItem>
              <SelectItem value="trades">Antal trades</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={toggleSortOrder}>
            <ArrowUpDown className={cn("h-4 w-4", sortOrder === "asc" && "rotate-180")} />
          </Button>
        </div>

        {/* Results List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredAndSortedResults.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Inga backtest-resultat</p>
              <p className="text-sm text-muted-foreground">
                Kör ett backtest på en regel för att se resultat här
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedResults.map((result) => {
              const isProfit = result.total_profit_loss_percent > 0;
              const hasGoodWinRate = result.win_rate > 60;
              const hasGoodPF = (result.profit_factor || 0) > 1.5;

              return (
                <Card
                  key={result.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedResult(result)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Rule name and date */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{result.rule_name}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(result.created_at), "d MMM yyyy HH:mm", { locale: sv })}</span>
                          <span className="text-muted-foreground/50">|</span>
                          <span>
                            {format(new Date(result.test_period_start), "d MMM", { locale: sv })} - {format(new Date(result.test_period_end), "d MMM yyyy", { locale: sv })}
                          </span>
                        </div>
                      </div>

                      {/* Center: Stats */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Trades</p>
                          <p className="font-mono font-medium">{result.total_trades}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                          <p className={cn(
                            "font-mono font-medium",
                            hasGoodWinRate && "text-primary"
                          )}>
                            {result.win_rate.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">PF</p>
                          <p className={cn(
                            "font-mono font-medium",
                            hasGoodPF && "text-primary"
                          )}>
                            {result.profit_factor?.toFixed(2) ?? "-"}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Max DD</p>
                          <p className="font-mono font-medium text-destructive">
                            {result.max_drawdown_percent?.toFixed(1) ?? "-"}%
                          </p>
                        </div>
                      </div>

                      {/* Right: Profit/Loss */}
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
                          isProfit
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        )}>
                          {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          <span>{isProfit ? "+" : ""}{result.total_profit_loss_percent.toFixed(2)}%</span>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex gap-2 mt-3">
                      {hasGoodWinRate && (
                        <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                          Hög Win Rate
                        </Badge>
                      )}
                      {hasGoodPF && (
                        <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                          Bra Profit Factor
                        </Badge>
                      )}
                      {(result.max_drawdown_percent || 0) > 10 && (
                        <Badge variant="outline" className="text-xs bg-amber-500/5 text-amber-500 border-amber-500/20">
                          Hög Drawdown
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedResult && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5 text-primary" />
                    {selectedResult.rule_name}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Percent className="h-3 w-3" />
                          <span className="text-xs">Avkastning</span>
                        </div>
                        <p className={cn(
                          "text-2xl font-bold font-mono",
                          selectedResult.total_profit_loss_percent > 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {selectedResult.total_profit_loss_percent > 0 ? "+" : ""}
                          {selectedResult.total_profit_loss_percent.toFixed(2)}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Target className="h-3 w-3" />
                          <span className="text-xs">Win Rate</span>
                        </div>
                        <p className="text-2xl font-bold font-mono">
                          {selectedResult.win_rate.toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <BarChart3 className="h-3 w-3" />
                          <span className="text-xs">Profit Factor</span>
                        </div>
                        <p className="text-2xl font-bold font-mono">
                          {selectedResult.profit_factor?.toFixed(2) ?? "-"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">Antal Trades</span>
                        </div>
                        <p className="text-2xl font-bold font-mono">
                          {selectedResult.total_trades}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Equity Curve */}
                  {selectedResult.equity_curve && selectedResult.equity_curve.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Equity Curve</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={selectedResult.equity_curve} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                              <defs>
                                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                              <XAxis
                                dataKey="timestamp"
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                tickFormatter={(v) => format(new Date(v), "d MMM", { locale: sv })}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                tickLine={false}
                                axisLine={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "hsl(var(--popover))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                }}
                                formatter={(value: number) => [`${value.toLocaleString("sv-SE")} SEK`, "Equity"]}
                              />
                              <ReferenceLine y={selectedResult.initial_capital_sek} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                              <Area type="monotone" dataKey="equity" stroke="none" fill="url(#equityGradient)" />
                              <Line type="monotone" dataKey="equity" stroke="#22c55e" strokeWidth={2} dot={false} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Trade Details */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Trade-detaljer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Vinnande trades</p>
                          <p className="font-mono font-medium text-green-500">{selectedResult.winning_trades}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Förlorande trades</p>
                          <p className="font-mono font-medium text-red-500">{selectedResult.losing_trades}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Snitt per trade</p>
                          <p className="font-mono font-medium">{selectedResult.avg_trade_sek?.toFixed(0) ?? "-"} SEK</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Bästa trade</p>
                          <p className="font-mono font-medium text-green-500">+{selectedResult.best_trade_sek?.toFixed(0) ?? "-"} SEK</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Sämsta trade</p>
                          <p className="font-mono font-medium text-red-500">{selectedResult.worst_trade_sek?.toFixed(0) ?? "-"} SEK</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Max Drawdown</p>
                          <p className="font-mono font-medium text-amber-500">{selectedResult.max_drawdown_percent?.toFixed(1) ?? "-"}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Test Info */}
                  <Card className="bg-muted/30">
                    <CardContent className="py-3">
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Period:</span>{" "}
                          {format(new Date(selectedResult.test_period_start), "d MMM yyyy", { locale: sv })} - {format(new Date(selectedResult.test_period_end), "d MMM yyyy", { locale: sv })}
                        </div>
                        <div>
                          <span className="font-medium">Startkapital:</span>{" "}
                          {selectedResult.initial_capital_sek.toLocaleString("sv-SE")} SEK
                        </div>
                        <div>
                          <span className="font-medium">Positionsstorlek:</span>{" "}
                          {selectedResult.position_size_sek.toLocaleString("sv-SE")} SEK
                        </div>
                        {selectedResult.data_points_analyzed && (
                          <div>
                            <span className="font-medium">Datapunkter:</span>{" "}
                            {selectedResult.data_points_analyzed.toLocaleString("sv-SE")}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default BacktestHistory;
