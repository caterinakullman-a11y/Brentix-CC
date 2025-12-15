import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLivePrice } from "@/hooks/prisanalys/useLivePrice";
import { useStatistics } from "@/hooks/prisanalys/useStatistics";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Activity,
  Clock,
  BarChart2,
  Droplets,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PriceChangeIndicator = ({
  value,
  percent,
  label,
}: {
  value: number;
  percent: number;
  label: string;
}) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  return (
    <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
      <span className="text-xs text-muted-foreground mb-1">{label}</span>
      <div className="flex items-center gap-1">
        {isNeutral ? (
          <Minus className="h-3 w-3 text-muted-foreground" />
        ) : isPositive ? (
          <TrendingUp className="h-3 w-3 text-green-500" />
        ) : (
          <TrendingDown className="h-3 w-3 text-red-500" />
        )}
        <span
          className={cn(
            "text-sm font-mono font-medium",
            isNeutral
              ? "text-muted-foreground"
              : isPositive
              ? "text-green-500"
              : "text-red-500"
          )}
        >
          {isPositive ? "+" : ""}
          {percent.toFixed(2)}%
        </span>
      </div>
    </div>
  );
};

const PrisanalysDashboard = () => {
  const livePrice = useLivePrice();
  const statistics = useStatistics({ startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) });

  // Fetch last 24h of price data for sparkline
  const { data: sparklineData } = useQuery({
    queryKey: ["prisanalys-sparkline"],
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from("price_data")
        .select("timestamp, close")
        .gte("timestamp", oneDayAgo.toISOString())
        .order("timestamp", { ascending: true })
        .limit(288); // ~5 min intervals for 24h

      if (error) throw error;
      return data?.map((row) => ({
        time: new Date(row.timestamp).toLocaleTimeString("sv-SE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        price: row.close,
      }));
    },
    refetchInterval: 60000,
  });

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString("sv-SE");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Prisanalys Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Realtidspris och marknadsöversikt för Brent Crude Oil
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => livePrice.refetch()}
            disabled={livePrice.isLoading}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", livePrice.isLoading && "animate-spin")}
            />
            Uppdatera
          </Button>
        </div>

        {/* Main Price Card */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Current Price */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Droplets className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Brent Crude Oil</p>
                  {livePrice.isLoading ? (
                    <Skeleton className="h-10 w-32" />
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold font-mono">
                        ${livePrice.currentPrice.toFixed(2)}
                      </span>
                      <Badge
                        variant={livePrice.change24h >= 0 ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {livePrice.change24h >= 0 ? "+" : ""}
                        {livePrice.changePercent24h.toFixed(2)}%
                      </Badge>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {formatTimestamp(livePrice.timestamp)}
                  </p>
                </div>
              </div>

              {/* Price Changes */}
              <div className="grid grid-cols-5 gap-2">
                <PriceChangeIndicator
                  value={livePrice.change1m}
                  percent={livePrice.changePercent1m}
                  label="1m"
                />
                <PriceChangeIndicator
                  value={livePrice.change5m}
                  percent={livePrice.changePercent5m}
                  label="5m"
                />
                <PriceChangeIndicator
                  value={livePrice.change15m}
                  percent={livePrice.changePercent15m}
                  label="15m"
                />
                <PriceChangeIndicator
                  value={livePrice.change1h}
                  percent={livePrice.changePercent1h}
                  label="1h"
                />
                <PriceChangeIndicator
                  value={livePrice.change24h}
                  percent={livePrice.changePercent24h}
                  label="24h"
                />
              </div>
            </div>

            {/* OHLV Data */}
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground">Öppning</p>
                <p className="text-lg font-mono font-medium">
                  ${livePrice.open.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Högsta</p>
                <p className="text-lg font-mono font-medium text-green-500">
                  ${livePrice.high.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lägsta</p>
                <p className="text-lg font-mono font-medium text-red-500">
                  ${livePrice.low.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Volym</p>
                <p className="text-lg font-mono font-medium">
                  {livePrice.volume.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sparkline Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Senaste 24 timmar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sparklineData && sparklineData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Pris"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="hsl(var(--primary))"
                      fill="url(#colorPrice)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                {livePrice.isLoading ? "Laddar data..." : "Ingen data tillgänglig"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Today's Range */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Dagens intervall</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-red-500 font-mono">
                  ${livePrice.low.toFixed(2)}
                </span>
                <div className="flex-1 mx-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                    style={{
                      width: `${
                        livePrice.high - livePrice.low > 0
                          ? ((livePrice.currentPrice - livePrice.low) /
                              (livePrice.high - livePrice.low)) *
                            100
                          : 50
                      }%`,
                    }}
                  />
                </div>
                <span className="text-green-500 font-mono">
                  ${livePrice.high.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Range: ${(livePrice.high - livePrice.low).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          {/* Week Stats */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Veckans statistik</CardTitle>
            </CardHeader>
            <CardContent>
              {statistics.priceStats ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Antal datapunkter</span>
                    <span className="text-sm font-mono">
                      {statistics.priceStats.total_records.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Upp/Ner</span>
                    <span className="text-sm font-mono">
                      <span className="text-green-500">{statistics.priceStats.up_days}</span>
                      {" / "}
                      <span className="text-red-500">{statistics.priceStats.down_days}</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Genomsnitt</span>
                    <span className="text-sm font-mono">
                      ${statistics.priceStats.avg_price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm">
                  Laddar statistik...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Best Trading Hours */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                Bästa handelstimmar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statistics.hourlyStats.length > 0 ? (
                <div className="space-y-2">
                  {statistics.hourlyStats
                    .sort((a, b) => b.up_probability - a.up_probability)
                    .slice(0, 3)
                    .map((stat, index) => (
                      <div key={stat.hour_of_day} className="flex items-center justify-between">
                        <span className="text-xs">
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}{" "}
                          {stat.hour_of_day.toString().padStart(2, "0")}:00
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {stat.up_probability.toFixed(0)}% upp
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm">
                  Otillräcklig data
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
            <a href="/prisanalys/historik">
              <Activity className="h-5 w-5" />
              <span>Historik</span>
            </a>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
            <a href="/prisanalys/statistik">
              <BarChart2 className="h-5 w-5" />
              <span>Statistik</span>
            </a>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
            <a href="/prisanalys/backtest">
              <TrendingUp className="h-5 w-5" />
              <span>Backtest</span>
            </a>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
            <a href="/prisanalys/ai">
              <Activity className="h-5 w-5" />
              <span>AI-Förslag</span>
            </a>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default PrisanalysDashboard;
