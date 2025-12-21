import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useHistoricalData,
  exportToCSV,
  type HistoricalDataFilters,
} from "@/hooks/prisanalys/useHistoricalData";
import { supabase } from "@/integrations/supabase/client";
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
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Database,
  TrendingUp,
  TrendingDown,
  BarChart3,
  TableIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, subMonths, subYears } from "date-fns";
import { sv } from "date-fns/locale";

const dayNames = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];

type QuickRange = "today" | "7d" | "30d" | "3m" | "1y" | "5y" | "max";

const QUICK_RANGES: { key: QuickRange; label: string }[] = [
  { key: "today", label: "Idag" },
  { key: "7d", label: "7 dagar" },
  { key: "30d", label: "30 dagar" },
  { key: "3m", label: "3 månader" },
  { key: "1y", label: "1 år" },
  { key: "5y", label: "5 år" },
  { key: "max", label: "Max" },
];

interface ChartPricePoint {
  timestamp: string;
  close: number;
  formattedDate: string;
}

function getChartDateRange(range: QuickRange): { from: Date; to: Date } {
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
      from = new Date("2020-01-01");
      break;
    default:
      from = subDays(to, 30);
  }

  return { from, to };
}

function useChartData(from: Date, to: Date) {
  return useQuery({
    queryKey: ["chart-price-history", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const queryFrom = new Date(Math.max(from.getTime(), new Date("2020-01-01").getTime()));
      const daysDiff = Math.ceil((to.getTime() - queryFrom.getTime()) / (1000 * 60 * 60 * 24));
      const targetPoints = 500;

      if (daysDiff > 30) {
        const chunkCount = Math.min(targetPoints, daysDiff);
        const chunkDuration = (to.getTime() - queryFrom.getTime()) / chunkCount;
        const allData: ChartPricePoint[] = [];
        const batchSize = 20;

        for (let batch = 0; batch < Math.ceil(chunkCount / batchSize); batch++) {
          const promises: Promise<ChartPricePoint | null>[] = [];

          for (let i = batch * batchSize; i < Math.min((batch + 1) * batchSize, chunkCount); i++) {
            const chunkStart = new Date(queryFrom.getTime() + i * chunkDuration);
            const chunkEnd = new Date(queryFrom.getTime() + (i + 1) * chunkDuration);

            promises.push(
              supabase
                .from("price_data")
                .select("timestamp, close")
                .gte("timestamp", chunkStart.toISOString())
                .lt("timestamp", chunkEnd.toISOString())
                .order("timestamp", { ascending: true })
                .limit(1)
                .then(({ data }) => data?.[0] ? {
                  timestamp: data[0].timestamp,
                  close: Number(data[0].close),
                  formattedDate: format(new Date(data[0].timestamp), "d MMM yyyy", { locale: sv }),
                } : null)
            );
          }

          const results = await Promise.all(promises);
          results.forEach(d => { if (d) allData.push(d); });
        }

        allData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return allData;
      }

      const { data, error } = await supabase
        .from("price_data")
        .select("timestamp, close")
        .gte("timestamp", queryFrom.toISOString())
        .lte("timestamp", to.toISOString())
        .order("timestamp", { ascending: true })
        .limit(2000);

      if (error) return [];

      return data.map(d => ({
        timestamp: d.timestamp,
        close: Number(d.close),
        formattedDate: format(new Date(d.timestamp), daysDiff <= 1 ? "HH:mm" : "d MMM", { locale: sv }),
      }));
    },
    staleTime: 60000 * 5,
  });
}

const PrisanalysHistorik = () => {
  const [filters, setFilters] = useState<HistoricalDataFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [quickRange, setQuickRange] = useState<QuickRange>("30d");

  const chartDateRange = useMemo(() => getChartDateRange(quickRange), [quickRange]);
  const { data: chartData, isLoading: chartLoading } = useChartData(chartDateRange.from, chartDateRange.to);

  const chartStats = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;
    const closes = chartData.map(p => p.close);
    const first = closes[0];
    const last = closes[closes.length - 1];
    const change = last - first;
    const changePercent = (change / first) * 100;
    return {
      min: Math.min(...closes),
      max: Math.max(...closes),
      avg: closes.reduce((a, b) => a + b, 0) / closes.length,
      change,
      changePercent,
      count: chartData.length,
    };
  }, [chartData]);

  const isPositiveChange = (chartStats?.changePercent ?? 0) >= 0;

  const { data, totalCount, page, pageSize, totalPages, isLoading, setPage, refetch } =
    useHistoricalData({ pageSize: 50, filters });

  const handleFilterChange = (key: keyof HistoricalDataFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const handleExport = () => {
    const filename = `brent-price-data-${new Date().toISOString().split("T")[0]}.csv`;
    exportToCSV(data, filename);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Historik
            </h1>
            <p className="text-sm text-muted-foreground">
              Utforska och exportera historisk prisdata
            </p>
          </div>
          <div className="flex gap-2">
            {viewMode === "table" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportera CSV
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Uppdatera
            </Button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "chart" | "table")}>
          <TabsList>
            <TabsTrigger value="chart" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Graf
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              <TableIcon className="h-4 w-4" />
              Tabell
            </TabsTrigger>
          </TabsList>

          {/* Chart View */}
          <TabsContent value="chart" className="space-y-4">
            {/* Quick Range Buttons */}
            <div className="flex flex-wrap gap-2">
              {QUICK_RANGES.map(({ key, label }) => (
                <Button
                  key={key}
                  variant={quickRange === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickRange(key)}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* Chart */}
            <Card>
              <CardContent className="pt-6">
                {chartLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : !chartData || chartData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Ingen data tillgänglig för valt datumintervall
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isPositiveChange ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={isPositiveChange ? "#22c55e" : "#ef4444"} stopOpacity={0} />
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
                          stroke={isPositiveChange ? "#22c55e" : "#ef4444"}
                          strokeWidth={2}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart Statistics */}
            {chartStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Högsta</p>
                    <p className="text-xl font-bold font-mono text-primary">
                      ${chartStats.max.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Lägsta</p>
                    <p className="text-xl font-bold font-mono text-destructive">
                      ${chartStats.min.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Medel</p>
                    <p className="text-xl font-bold font-mono">
                      ${chartStats.avg.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Förändring</p>
                    <p className={cn(
                      "text-xl font-bold font-mono",
                      isPositiveChange ? "text-green-500" : "text-red-500"
                    )}>
                      {isPositiveChange ? "+" : ""}{chartStats.changePercent.toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Table View */}
          <TabsContent value="table" className="space-y-4">

        {/* Filters */}
        {showFilters && (
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm">Filtrera data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="startDate">Från datum</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate?.toISOString().split("T")[0] ?? ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "startDate",
                        e.target.value ? new Date(e.target.value) : undefined
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Till datum</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate?.toISOString().split("T")[0] ?? ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "endDate",
                        e.target.value ? new Date(e.target.value) : undefined
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="dayOfWeek">Veckodag</Label>
                  <Select
                    value={filters.dayOfWeek?.toString() ?? "all"}
                    onValueChange={(value) =>
                      handleFilterChange(
                        "dayOfWeek",
                        value === "all" ? null : parseInt(value)
                      )
                    }
                  >
                    <SelectTrigger id="dayOfWeek">
                      <SelectValue placeholder="Alla dagar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alla dagar</SelectItem>
                      {dayNames.map((name, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="hourOfDay">Timme</Label>
                  <Select
                    value={filters.hourOfDay?.toString() ?? "all"}
                    onValueChange={(value) =>
                      handleFilterChange(
                        "hourOfDay",
                        value === "all" ? null : parseInt(value)
                      )
                    }
                  >
                    <SelectTrigger id="hourOfDay">
                      <SelectValue placeholder="Alla timmar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alla timmar</SelectItem>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, "0")}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Rensa filter
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Totalt antal</span>
              </div>
              <p className="text-2xl font-bold font-mono mt-1">
                {totalCount.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Uppgångar</span>
              </div>
              <p className="text-2xl font-bold font-mono mt-1 text-green-500">
                {data.filter((row) => (row.price_change ?? 0) > 0).length}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Nedgångar</span>
              </div>
              <p className="text-2xl font-bold font-mono mt-1 text-red-500">
                {data.filter((row) => (row.price_change ?? 0) < 0).length}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Visar sida</span>
              </div>
              <p className="text-2xl font-bold font-mono mt-1">
                {page} / {totalPages || 1}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tidpunkt</TableHead>
                    <TableHead className="text-right">Öppning</TableHead>
                    <TableHead className="text-right">Högsta</TableHead>
                    <TableHead className="text-right">Lägsta</TableHead>
                    <TableHead className="text-right">Stängning</TableHead>
                    <TableHead className="text-right">Förändring</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead>Dag</TableHead>
                    <TableHead>Timme</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Ingen data hittades
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => {
                      const change = row.price_change ?? 0;
                      const changePercent = row.price_change_percent ?? 0;
                      const isPositive = change > 0;
                      const isNegative = change < 0;

                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-sm">
                            {formatTimestamp(row.timestamp)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${row.open.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-500">
                            ${row.high.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-500">
                            ${row.low.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            ${row.close.toFixed(2)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-mono",
                              isPositive && "text-green-500",
                              isNegative && "text-red-500"
                            )}
                          >
                            {isPositive ? "+" : ""}
                            {change.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={isPositive ? "default" : isNegative ? "destructive" : "secondary"}
                              className="font-mono text-xs"
                            >
                              {isPositive ? "+" : ""}
                              {changePercent.toFixed(2)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {dayNames[row.day_of_week ?? 0]}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {row.hour_of_day?.toString().padStart(2, "0")}:
                            {row.minute_of_hour?.toString().padStart(2, "0")}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Visar {(page - 1) * pageSize + 1} -{" "}
                {Math.min(page * pageSize, totalCount)} av {totalCount} rader
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Föregående
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages || isLoading}
                >
                  Nästa
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default PrisanalysHistorik;
