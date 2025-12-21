import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePerformanceData } from "@/hooks/usePerformanceData";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Download,
  BarChart3,
  PieChart,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart as RechartsPie,
  Pie,
} from "recharts";

type DateRange = "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL";

const dateRanges: DateRange[] = ["1W", "1M", "3M", "YTD", "1Y", "ALL"];

export default function Performance() {
  const [selectedRange, setSelectedRange] = useState<DateRange>("1M");
  const { settings } = useUserSettings();
  const initialCapital = settings?.initial_capital_sek ?? 10000;
  
  const { stats, equityCurve, monthlyReturns, isLoading } = usePerformanceData(
    selectedRange,
    initialCapital
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const pieData = [
    { name: "Wins", value: stats.winningTrades, color: "hsl(var(--chart-2))" },
    { name: "Losses", value: stats.losingTrades, color: "hsl(var(--chart-1))" },
  ];

  const handleExport = () => {
    // Simple CSV export
    const headers = ["Date", "P/L (SEK)", "P/L (%)"];
    const rows = monthlyReturns.map((r) => [r.month, r.pl.toFixed(2), ""]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-${selectedRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Performance</h1>
            <p className="text-sm text-muted-foreground">
              Trading analytics and performance metrics
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Date Range Filter */}
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1 w-fit">
          {dateRanges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedRange === range
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total P/L */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total P/L
              </CardTitle>
              {stats.totalPL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-chart-2" />
              ) : (
                <TrendingDown className="h-4 w-4 text-chart-1" />
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div
                    className={`text-2xl font-bold ${
                      stats.totalPL >= 0 ? "text-chart-2" : "text-chart-1"
                    }`}
                  >
                    {formatCurrency(stats.totalPL)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatPercent(stats.totalPLPercent)} vs starting capital
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Win Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Win Rate
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-foreground">
                    {stats.winRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.winningTrades} wins / {stats.totalTrades} trades
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Best Trade */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Best Trade
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : stats.bestTrade ? (
                <>
                  <div className="text-2xl font-bold text-chart-2">
                    {formatCurrency(stats.bestTrade.amount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.bestTrade.date
                      ? format(parseISO(stats.bestTrade.date), "MMM d, yyyy")
                      : "-"}
                  </p>
                </>
              ) : (
                <div className="text-2xl font-bold text-muted-foreground">-</div>
              )}
            </CardContent>
          </Card>

          {/* Worst Trade */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Worst Trade
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-chart-1" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : stats.worstTrade ? (
                <>
                  <div className="text-2xl font-bold text-chart-1">
                    {formatCurrency(stats.worstTrade.amount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.worstTrade.date
                      ? format(parseISO(stats.worstTrade.date), "MMM d, yyyy")
                      : "-"}
                  </p>
                </>
              ) : (
                <div className="text-2xl font-bold text-muted-foreground">-</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Equity Curve */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Equity Curve
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : equityCurve.length > 1 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [formatCurrency(value), "Value"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                  No trade data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Returns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Monthly Returns
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : monthlyReturns.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyReturns}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [formatCurrency(value), "P/L"]}
                    />
                    <Bar dataKey="pl" radius={[4, 4, 0, 0]}>
                      {monthlyReturns.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.pl >= 0 ? "hsl(var(--chart-2))" : "hsl(var(--chart-1))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                  No monthly data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats and Distribution Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Statistics Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Trades</span>
                    <span className="font-medium">{stats.totalTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Winning Trades</span>
                    <span className="font-medium text-chart-2">{stats.winningTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Losing Trades</span>
                    <span className="font-medium text-chart-1">{stats.losingTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Win</span>
                    <span className="font-medium text-chart-2">
                      {formatCurrency(stats.avgWin)}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Loss</span>
                    <span className="font-medium text-chart-1">
                      {formatCurrency(stats.avgLoss)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Profit Factor</span>
                    <span className="font-medium">
                      {stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Max Drawdown</span>
                    <span className="font-medium text-chart-1">
                      {stats.maxDrawdown.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                    <span className="font-medium">{stats.winRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trade Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChart className="h-4 w-4" />
                Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[180px] w-full" />
              ) : stats.totalTrades > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[180px] items-center justify-center text-muted-foreground">
                  No trades yet
                </div>
              )}
              <div className="mt-2 flex justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-chart-2" />
                  <span className="text-muted-foreground">Wins</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-chart-1" />
                  <span className="text-muted-foreground">Losses</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        {!isLoading && stats.totalTrades === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium text-foreground">No trades yet</p>
              <p className="text-sm text-muted-foreground">
                Start trading to see your performance analytics
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
