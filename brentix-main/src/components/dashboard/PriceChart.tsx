import { useState, useCallback } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { usePriceHistoryWithInterval, type DataInterval } from "@/hooks/usePriceHistory";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subHours, subDays, subWeeks, subMonths, subYears } from "date-fns";
import { sv } from "date-fns/locale";

type TimePreset = "1H" | "24H" | "1W" | "1M" | "1Y" | "CUSTOM";

const timePresets: { value: TimePreset; label: string }[] = [
  { value: "1H", label: "1H" },
  { value: "24H", label: "24H" },
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "1Y", label: "1Y" },
];

const intervalOptions: { value: DataInterval; label: string }[] = [
  { value: "1m", label: "1 min" },
  { value: "5m", label: "5 min" },
  { value: "15m", label: "15 min" },
  { value: "1h", label: "1 tim" },
  { value: "4h", label: "4 tim" },
  { value: "1d", label: "1 dag" },
  { value: "1w", label: "1 vecka" },
  { value: "1M", label: "1 mån" },
];

// Smart interval defaults based on time range
function getDefaultInterval(preset: TimePreset): DataInterval {
  switch (preset) {
    case "1H": return "1m";
    case "24H": return "15m";
    case "1W": return "1h";
    case "1M": return "4h";
    case "1Y": return "1d";
    case "CUSTOM": return "1d";
    default: return "1h";
  }
}

function getTimeRangeFromPreset(preset: TimePreset): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case "1H": return { from: subHours(now, 1), to: now };
    case "24H": return { from: subDays(now, 1), to: now };
    case "1W": return { from: subWeeks(now, 1), to: now };
    case "1M": return { from: subMonths(now, 1), to: now };
    case "1Y": return { from: subYears(now, 1), to: now };
    default: return { from: subDays(now, 1), to: now };
  }
}

function ChartSkeleton() {
  return (
    <div className="h-[600px] flex items-center justify-center">
      <div className="space-y-3 w-full">
        <Skeleton className="h-4 w-3/4 mx-auto" />
        <Skeleton className="h-[250px] w-full" />
      </div>
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="h-[600px] flex flex-col items-center justify-center text-muted-foreground">
      <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
      <p className="text-lg font-medium">Ingen prisdata tillgänglig</p>
      <p className="text-sm">Väntar på datainsamling...</p>
    </div>
  );
}

function ChartError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-[600px] flex flex-col items-center justify-center text-muted-foreground">
      <AlertCircle className="h-12 w-12 mb-4 text-destructive opacity-50" />
      <p className="text-lg font-medium">Kunde inte ladda prisdata</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Försök igen
      </Button>
    </div>
  );
}

export function PriceChart() {
  const [activePreset, setActivePreset] = useState<TimePreset>("24H");
  const [interval, setInterval] = useState<DataInterval>("15m");
  const [timeRange, setTimeRange] = useState(() => getTimeRangeFromPreset("24H"));
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const { data, statistics, isLoading, error } = usePriceHistoryWithInterval(timeRange, interval);

  const handlePresetClick = useCallback((preset: TimePreset) => {
    setActivePreset(preset);
    const newRange = getTimeRangeFromPreset(preset);
    setTimeRange(newRange);
    const newInterval = getDefaultInterval(preset);
    setInterval(newInterval);
  }, []);

  const handleFromDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setTimeRange(prev => ({ from: date, to: prev.to }));
      setActivePreset("CUSTOM");
      setFromOpen(false);
    }
  }, []);

  const handleToDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setTimeRange(prev => ({ from: prev.from, to: date }));
      setActivePreset("CUSTOM");
      setToOpen(false);
    }
  }, []);

  const handleIntervalChange = useCallback((value: DataInterval) => {
    setInterval(value);
  }, []);

  // Beräkna om trenden är positiv
  const isPositive = data && data.length >= 2
    ? data[data.length - 1].price >= data[0].price
    : true;

  return (
    <div className="glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
      <div className="flex flex-col gap-4 mb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Prisdiagram</h3>
          {statistics && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Senaste: <span className="text-foreground font-mono font-semibold">${statistics.avg.toFixed(2)}</span>
              </span>
              <span className={cn(
                "font-semibold",
                statistics.changePercent >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {statistics.changePercent >= 0 ? "+" : ""}{statistics.changePercent.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Time Controls - Row 1: Presets and Interval */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Presets */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {timePresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetClick(preset.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  activePreset === preset.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Interval Selector - Now next to presets */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Intervall:</span>
            <Select value={interval} onValueChange={(value) => handleIntervalChange(value as DataInterval)}>
              <SelectTrigger className="w-[110px] h-9 text-sm">
                <SelectValue placeholder="Intervall" />
              </SelectTrigger>
              <SelectContent>
                {intervalOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Time Controls - Row 2: Custom Date Range */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Period:</span>
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[120px] justify-start text-left font-normal",
                  activePreset === "CUSTOM" && "border-primary"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(timeRange.from, "d MMM", { locale: sv })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={timeRange.from}
                onSelect={handleFromDateSelect}
                initialFocus
                disabled={(date) => date > timeRange.to || date > new Date()}
              />
            </PopoverContent>
          </Popover>

          <span className="text-sm text-muted-foreground">–</span>

          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[120px] justify-start text-left font-normal",
                  activePreset === "CUSTOM" && "border-primary"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(timeRange.to, "d MMM", { locale: sv })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={timeRange.to}
                onSelect={handleToDateSelect}
                initialFocus
                disabled={(date) => date < timeRange.from || date > new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Statistics Row */}
        {statistics && (
          <div className="grid grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Högsta</p>
              <p className="font-semibold font-mono">${statistics.max.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lägsta</p>
              <p className="font-semibold font-mono">${statistics.min.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Medel</p>
              <p className="font-semibold font-mono">${statistics.avg.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Datapunkter</p>
              <p className="font-semibold">{statistics.count}</p>
            </div>
          </div>
        )}
      </div>

      <div className="h-[600px]">
        {isLoading ? (
          <ChartSkeleton />
        ) : error ? (
          <ChartError onRetry={() => {}} />
        ) : !data || data.length === 0 ? (
          <ChartEmpty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="priceGradientPositive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="priceGradientNegative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                domain={["dataMin - 0.5", "dataMax + 0.5"]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                itemStyle={{ color: isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Pris"]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                strokeWidth={2}
                fill={isPositive ? "url(#priceGradientPositive)" : "url(#priceGradientNegative)"}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
