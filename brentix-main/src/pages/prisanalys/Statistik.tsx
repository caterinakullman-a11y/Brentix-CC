import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useStatistics } from "@/hooks/prisanalys/useStatistics";
import {
  RefreshCw,
  BarChart2,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

const dayNames = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];

const periodOptions = [
  { value: "7", label: "Senaste 7 dagar" },
  { value: "30", label: "Senaste 30 dagar" },
  { value: "90", label: "Senaste 90 dagar" },
  { value: "365", label: "Senaste året" },
];

const PrisanalysStatistik = () => {
  const [period, setPeriod] = useState("30");

  const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);
  const { hourlyStats, dailyStats, priceStats, heatmapData, isLoading, refetch } =
    useStatistics({ startDate });

  // Prepare hourly chart data
  const hourlyChartData = hourlyStats.map((stat) => ({
    hour: `${stat.hour_of_day.toString().padStart(2, "0")}:00`,
    upProbability: stat.up_probability,
    avgChange: stat.avg_price_change_percent,
    samples: stat.sample_count,
  }));

  // Prepare daily chart data
  const dailyChartData = dailyStats.map((stat) => ({
    day: dayNames[stat.day_of_week],
    dayFull: stat.day_name,
    upProbability: stat.up_probability,
    avgChange: stat.avg_price_change_percent,
    volatility: stat.volatility,
    samples: stat.sample_count,
  }));

  // Get best and worst hours
  const sortedByProbability = [...hourlyStats].sort(
    (a, b) => b.up_probability - a.up_probability
  );
  const bestHours = sortedByProbability.slice(0, 3);
  const worstHours = sortedByProbability.slice(-3).reverse();

  return (
    <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Statistik</h1>
            <p className="text-sm text-muted-foreground">
              Analysera prismönster över tid
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2">
              <Label htmlFor="period" className="text-sm">
                Period:
              </Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="period" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Uppdatera
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {priceStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Datapunkter</span>
                </div>
                <p className="text-2xl font-bold font-mono">
                  {priceStats.total_records.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                </div>
                <p className="text-2xl font-bold font-mono text-green-500">
                  {(
                    (priceStats.up_days /
                      (priceStats.up_days + priceStats.down_days + priceStats.unchanged_days)) *
                    100
                  ).toFixed(1)}
                  %
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Avg. Range</span>
                </div>
                <p className="text-2xl font-bold font-mono">
                  ${priceStats.avg_daily_range.toFixed(4)}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-muted-foreground">Prisintervall</span>
                </div>
                <p className="text-lg font-mono">
                  <span className="text-red-500">${priceStats.min_price.toFixed(2)}</span>
                  {" - "}
                  <span className="text-green-500">${priceStats.max_price.toFixed(2)}</span>
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Hourly Analysis */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timbaserad analys
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : hourlyChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number, name: string) => [
                        name === "upProbability"
                          ? `${value.toFixed(1)}%`
                          : value.toFixed(4),
                        name === "upProbability" ? "Sannolikhet upp" : "Genomsnitt",
                      ]}
                    />
                    <Bar dataKey="upProbability" name="Sannolikhet upp" radius={[4, 4, 0, 0]}>
                      {hourlyChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.upProbability >= 50 ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Ingen data tillgänglig
              </div>
            )}
          </CardContent>
        </Card>

        {/* Best/Worst Hours */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-500 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Bästa handelstimmar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bestHours.length > 0 ? (
                <div className="space-y-3">
                  {bestHours.map((stat, index) => (
                    <div
                      key={stat.hour_of_day}
                      className="flex items-center justify-between p-2 rounded-lg bg-green-500/10"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                        </span>
                        <span className="font-mono">
                          {stat.hour_of_day.toString().padStart(2, "0")}:00
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-500">
                          {stat.up_probability.toFixed(1)}% upp
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({stat.sample_count} samples)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Ingen data</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-500 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Sämsta handelstimmar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {worstHours.length > 0 ? (
                <div className="space-y-3">
                  {worstHours.map((stat, index) => (
                    <div
                      key={stat.hour_of_day}
                      className="flex items-center justify-between p-2 rounded-lg bg-red-500/10"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {stat.hour_of_day.toString().padStart(2, "0")}:00
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-red-500">
                          {stat.up_probability.toFixed(1)}% upp
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({stat.sample_count} samples)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Ingen data</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Daily Analysis */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Veckodagsanalys
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : dailyChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Sannolikhet upp"]}
                    />
                    <Bar dataKey="upProbability" name="Sannolikhet upp" radius={[4, 4, 0, 0]}>
                      {dailyChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.upProbability >= 50 ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Ingen data tillgänglig
              </div>
            )}
          </CardContent>
        </Card>

        {/* Heatmap Preview */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Heatmap: Dag vs Timme
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : heatmapData.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-1 min-w-[800px]">
                  {/* Header row */}
                  <div className="p-1"></div>
                  {Array.from({ length: 24 }, (_, i) => (
                    <div key={i} className="p-1 text-xs text-center text-muted-foreground">
                      {i.toString().padStart(2, "0")}
                    </div>
                  ))}

                  {/* Data rows */}
                  {dayNames.map((dayName, dayIndex) => (
                    <>
                      <div key={`day-${dayIndex}`} className="p-1 text-xs text-muted-foreground">
                        {dayName}
                      </div>
                      {Array.from({ length: 24 }, (_, hourIndex) => {
                        const cell = heatmapData.find(
                          (c) => c.day_of_week === dayIndex && c.hour_of_day === hourIndex
                        );
                        const probability = cell?.up_probability ?? 50;
                        const intensity = Math.abs(probability - 50) / 50;

                        return (
                          <div
                            key={`${dayIndex}-${hourIndex}`}
                            className="aspect-square rounded-sm cursor-pointer transition-transform hover:scale-110"
                            style={{
                              backgroundColor:
                                probability >= 50
                                  ? `rgba(34, 197, 94, ${0.2 + intensity * 0.6})`
                                  : `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`,
                            }}
                            title={`${dayName} ${hourIndex}:00 - ${probability.toFixed(1)}% upp (${cell?.sample_count ?? 0} samples)`}
                          />
                        );
                      })}
                    </>
                  ))}
                </div>
                <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-red-500/60" />
                    Stark nedgång
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-gray-500/30" />
                    Neutral
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-green-500/60" />
                    Stark uppgång
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Ingen data tillgänglig
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
};

export default PrisanalysStatistik;
