import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  CartesianGrid
} from "recharts";
import {
  CalendarIcon,
  Download,
  TrendingUp,
  TrendingDown,
  Database,
  Clock,
  BarChart3
} from "lucide-react";
import { format, subDays, subMonths, subYears } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Resolution = "minute" | "hour" | "day" | "week" | "month";
type QuickRange = "today" | "7d" | "30d" | "3m" | "1y" | "5y" | "max";

interface PricePoint {
  timestamp: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
}

const QUICK_RANGES: { key: QuickRange; label: string }[] = [
  { key: "today", label: "Idag" },
  { key: "7d", label: "7 dagar" },
  { key: "30d", label: "30 dagar" },
  { key: "3m", label: "3 månader" },
  { key: "1y", label: "1 år" },
  { key: "5y", label: "5 år" },
  { key: "max", label: "Max" },
];

const RESOLUTIONS: { key: Resolution; label: string }[] = [
  { key: "minute", label: "Minut" },
  { key: "hour", label: "Timme" },
  { key: "day", label: "Dag" },
  { key: "week", label: "Vecka" },
  { key: "month", label: "Månad" },
];

function getDateRange(range: QuickRange): { from: Date; to: Date } {
  const to = new Date();
  let from: Date;

  switch (range) {
    case "today":
      from = new Date();
      from.setHours(0, 0, 0, 0);
      break;
    case "7d":
      from = subDays(to, 7);
      break;
    case "30d":
      from = subDays(to, 30);
      break;
    case "3m":
      from = subMonths(to, 3);
      break;
    case "1y":
      from = subYears(to, 1);
      break;
    case "5y":
      from = subYears(to, 5);
      break;
    case "max":
      from = new Date("1987-01-01");
      break;
    default:
      from = subDays(to, 30);
  }

  return { from, to };
}

function usePriceHistory(from: Date, to: Date, resolution: Resolution) {
  return useQuery({
    queryKey: ["price-history", from.toISOString(), to.toISOString(), resolution],
    queryFn: async () => {
      const fromYear = from.getFullYear();
      const toYear = to.getFullYear();

      // Determine which table(s) to query
      const useLegacy = fromYear < 2020;
      const usePrimary = toYear >= 2020;

      let allData: PricePoint[] = [];

      // Query legacy data (1987-2019) if needed
      if (useLegacy) {
        const legacyEnd = new Date(Math.min(to.getTime(), new Date("2019-12-31").getTime()));

        const { data: legacyData, error: legacyError } = await supabase
          .from("price_data_legacy")
          .select("timestamp, close, open, high, low")
          .gte("timestamp", from.toISOString().split("T")[0])
          .lte("timestamp", legacyEnd.toISOString().split("T")[0])
          .order("timestamp", { ascending: true });

        if (!legacyError && legacyData) {
          allData = legacyData.map(d => ({
            timestamp: d.timestamp,
            close: Number(d.close),
            open: d.open ? Number(d.open) : undefined,
            high: d.high ? Number(d.high) : undefined,
            low: d.low ? Number(d.low) : undefined,
          }));
        }
      }

      // Query primary data (2020+) if needed
      if (usePrimary) {
        const primaryStart = new Date(Math.max(from.getTime(), new Date("2020-01-01").getTime()));

        // For minute/hour resolution, sample the data to avoid too many points
        let query = supabase
          .from("price_data")
          .select("timestamp, close, open, high, low")
          .gte("timestamp", primaryStart.toISOString())
          .lte("timestamp", to.toISOString())
          .order("timestamp", { ascending: true });

        // Limit points based on resolution
        if (resolution === "minute") {
          query = query.limit(1440); // Max 1 day of minute data
        } else if (resolution === "hour") {
          query = query.limit(720); // Max 30 days of hourly data
        } else {
          query = query.limit(5000);
        }

        const { data: primaryData, error: primaryError } = await query;

        if (!primaryError && primaryData) {
          const mapped = primaryData.map(d => ({
            timestamp: d.timestamp,
            close: Number(d.close),
            open: d.open ? Number(d.open) : undefined,
            high: d.high ? Number(d.high) : undefined,
            low: d.low ? Number(d.low) : undefined,
          }));
          allData = [...allData, ...mapped];
        }
      }

      // Aggregate data based on resolution if needed
      if (resolution !== "minute" && allData.length > 0) {
        allData = aggregateData(allData, resolution);
      }

      return allData;
    },
    staleTime: 60000 * 5, // 5 minutes
  });
}

function aggregateData(data: PricePoint[], resolution: Resolution): PricePoint[] {
  if (data.length === 0) return [];

  const grouped = new Map<string, PricePoint[]>();

  data.forEach(point => {
    const date = new Date(point.timestamp);
    let key: string;

    switch (resolution) {
      case "hour":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}`;
        break;
      case "day":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        break;
      case "week":
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
        break;
      case "month":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        break;
      default:
        key = point.timestamp;
    }

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(point);
  });

  return Array.from(grouped.entries()).map(([key, points]) => {
    const closes = points.map(p => p.close);
    const highs = points.map(p => p.high ?? p.close);
    const lows = points.map(p => p.low ?? p.close);

    return {
      timestamp: key,
      close: points[points.length - 1].close,
      open: points[0].open ?? points[0].close,
      high: Math.max(...highs),
      low: Math.min(...lows),
    };
  });
}

const PriceHistory = () => {
  const [quickRange, setQuickRange] = useState<QuickRange>("30d");
  const [resolution, setResolution] = useState<Resolution>("day");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const dateRange = useMemo(() => {
    if (customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return getDateRange(quickRange);
  }, [quickRange, customFrom, customTo]);

  const { data: priceData, isLoading } = usePriceHistory(
    dateRange.from,
    dateRange.to,
    resolution
  );

  const statistics = useMemo(() => {
    if (!priceData || priceData.length === 0) return null;

    const closes = priceData.map(p => p.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const avg = closes.reduce((a, b) => a + b, 0) / closes.length;
    const first = closes[0];
    const last = closes[closes.length - 1];
    const change = last - first;
    const changePercent = (change / first) * 100;

    return { min, max, avg, change, changePercent, count: priceData.length };
  }, [priceData]);

  const chartData = useMemo(() => {
    if (!priceData) return [];
    return priceData.map(p => ({
      ...p,
      formattedDate: format(new Date(p.timestamp),
        resolution === "minute" ? "HH:mm" :
        resolution === "hour" ? "d MMM HH:mm" :
        resolution === "month" ? "MMM yyyy" :
        "d MMM yyyy",
        { locale: sv }
      ),
    }));
  }, [priceData, resolution]);

  const handleQuickRange = (range: QuickRange) => {
    setQuickRange(range);
    setCustomFrom(undefined);
    setCustomTo(undefined);
  };

  const handleExport = () => {
    if (!priceData || priceData.length === 0) return;

    const csv = [
      "Timestamp,Close,Open,High,Low",
      ...priceData.map(p =>
        `${p.timestamp},${p.close},${p.open ?? ""},${p.high ?? ""},${p.low ?? ""}`
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brent-price-history-${format(dateRange.from, "yyyy-MM-dd")}-${format(dateRange.to, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isPositive = (statistics?.changePercent ?? 0) >= 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Kurshistorik
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Historiska priser för Brent Crude Oil
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!priceData?.length}>
            <Download className="h-4 w-4 mr-2" />
            Exportera
          </Button>
        </div>

        {/* Data Sources Info */}
        <Card className="bg-muted/30">
          <CardContent className="py-3">
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" />
                <span><strong>Minut:</strong> Brentix databas (2020+)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span><strong>Daglig:</strong> Historisk data (1987-2019)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Range Buttons */}
        <div className="flex flex-wrap gap-2">
          {QUICK_RANGES.map(({ key, label }) => (
            <Button
              key={key}
              variant={quickRange === key && !customFrom ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickRange(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Date Pickers and Resolution */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Från:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[140px] justify-start">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(dateRange.from, "yyyy-MM-dd")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customFrom ?? dateRange.from}
                  onSelect={(date) => {
                    setCustomFrom(date);
                    if (!customTo) setCustomTo(new Date());
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Till:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-[140px] justify-start">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(dateRange.to, "yyyy-MM-dd")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customTo ?? dateRange.to}
                  onSelect={setCustomTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Visa:</span>
            <Select value={resolution} onValueChange={(v) => setResolution(v as Resolution)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTIONS.map(({ key, label }) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chart */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Ingen data tillgänglig för valt datumintervall
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="formattedDate"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => `$${v}`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Pris"]}
                      labelFormatter={(label) => label}
                    />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke="none"
                      fill="url(#priceGradient)"
                    />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke={isPositive ? "#22c55e" : "#ef4444"}
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Högsta</p>
                <p className="text-xl font-bold font-mono text-primary">
                  ${statistics.max.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Lägsta</p>
                <p className="text-xl font-bold font-mono text-destructive">
                  ${statistics.min.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Medel</p>
                <p className="text-xl font-bold font-mono">
                  ${statistics.avg.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Datapunkter</p>
                <p className="text-xl font-bold font-mono">
                  {statistics.count.toLocaleString("sv-SE")}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Change indicator */}
        {statistics && (
          <Card className="bg-muted/30">
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm text-muted-foreground">Förändring under perioden:</span>
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium",
                  isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span>{isPositive ? "+" : ""}{statistics.change.toFixed(2)} USD</span>
                  <span>({isPositive ? "+" : ""}{statistics.changePercent.toFixed(2)}%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default PriceHistory;
