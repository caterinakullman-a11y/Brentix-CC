import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subHours, subDays, subWeeks, subMonths, startOfHour, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { sv } from "date-fns/locale";

// Legacy time range presets
export type TimeRange = "1H" | "4H" | "1D" | "1W" | "1M";

// New interval types
export type DataInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w" | "1M";

interface PricePoint {
  time: string;
  price: number;
  high: number;
  low: number;
}

interface CustomTimeRange {
  from: Date;
  to: Date;
}

interface PriceDataPoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

interface AggregatedPrice {
  time: string;
  date: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceStatistics {
  count: number;
  min: number;
  max: number;
  avg: number;
  firstDate: string;
  lastDate: string;
  change: number;
  changePercent: number;
}

interface PriceHistoryResult {
  data: AggregatedPrice[];
  statistics: PriceStatistics | null;
  isLoading: boolean;
  error: Error | null;
}

const getRangeConfig = (range: TimeRange) => {
  const now = new Date();

  switch (range) {
    case "1H":
      return { from: subHours(now, 1), limit: 60, formatStr: "HH:mm" };
    case "4H":
      return { from: subHours(now, 4), limit: 48, formatStr: "HH:mm" };
    case "1D":
      return { from: subDays(now, 1), limit: 288, formatStr: "HH:mm" };
    case "1W":
      return { from: subWeeks(now, 1), limit: 168, formatStr: "EEE HH:mm" };
    case "1M":
      return { from: subMonths(now, 1), limit: 720, formatStr: "dd MMM" };
    default:
      return { from: subDays(now, 1), limit: 288, formatStr: "HH:mm" };
  }
};

// Get interval in minutes
function getIntervalMinutes(interval: DataInterval): number {
  switch (interval) {
    case "1m": return 1;
    case "5m": return 5;
    case "15m": return 15;
    case "1h": return 60;
    case "4h": return 240;
    case "1d": return 1440;
    case "1w": return 10080;
    case "1M": return 43200;
    default: return 60;
  }
}

// Get appropriate time format based on interval
function getTimeFormat(interval: DataInterval): string {
  switch (interval) {
    case "1m":
    case "5m":
    case "15m":
      return "HH:mm";
    case "1h":
    case "4h":
      return "d MMM HH:mm";
    case "1d":
      return "d MMM";
    case "1w":
    case "1M":
      return "d MMM yyyy";
    default:
      return "d MMM HH:mm";
  }
}

// Aggregate data points by interval
function aggregateByInterval(data: PriceDataPoint[], interval: DataInterval): AggregatedPrice[] {
  if (data.length === 0) return [];

  const intervalMinutes = getIntervalMinutes(interval);
  const buckets = new Map<string, PriceDataPoint[]>();
  const timeFormat = getTimeFormat(interval);

  data.forEach((point) => {
    const timestamp = new Date(point.timestamp);
    let bucketKey: string;

    if (interval === "1M") {
      bucketKey = format(startOfMonth(timestamp), "yyyy-MM-dd'T'HH:mm:ss");
    } else if (interval === "1w") {
      bucketKey = format(startOfWeek(timestamp, { weekStartsOn: 1 }), "yyyy-MM-dd'T'HH:mm:ss");
    } else if (interval === "1d") {
      bucketKey = format(startOfDay(timestamp), "yyyy-MM-dd'T'HH:mm:ss");
    } else if (intervalMinutes >= 60) {
      const hoursToRound = intervalMinutes / 60;
      const startHour = startOfHour(timestamp);
      const roundedHour = new Date(startHour);
      roundedHour.setHours(Math.floor(startHour.getHours() / hoursToRound) * hoursToRound);
      bucketKey = format(roundedHour, "yyyy-MM-dd'T'HH:mm:ss");
    } else {
      const roundedMinutes = Math.floor(timestamp.getMinutes() / intervalMinutes) * intervalMinutes;
      const roundedTime = new Date(timestamp);
      roundedTime.setMinutes(roundedMinutes, 0, 0);
      bucketKey = format(roundedTime, "yyyy-MM-dd'T'HH:mm:ss");
    }

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
    }
    buckets.get(bucketKey)!.push(point);
  });

  const aggregated: AggregatedPrice[] = [];
  const sortedKeys = Array.from(buckets.keys()).sort();

  for (const key of sortedKeys) {
    const points = buckets.get(key)!;
    if (points.length === 0) continue;

    const open = points[0].open;
    const close = points[points.length - 1].close;
    const high = Math.max(...points.map(p => p.high));
    const low = Math.min(...points.map(p => p.low));
    const volume = points.reduce((sum, p) => sum + (p.volume ?? 0), 0);

    aggregated.push({
      time: format(new Date(key), timeFormat, { locale: sv }),
      date: key,
      price: close,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return aggregated;
}

// Legacy hook for backward compatibility
export function usePriceHistory(range: TimeRange) {
  return useQuery({
    queryKey: ["price-history", range],
    queryFn: async (): Promise<PricePoint[]> => {
      const config = getRangeConfig(range);

      const { data, error } = await supabase
        .from("price_data")
        .select("timestamp, close, high, low")
        .gte("timestamp", config.from.toISOString())
        .order("timestamp", { ascending: true })
        .limit(config.limit);

      if (error) {
        console.error("Error fetching price history:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      const points: PricePoint[] = data.map((p) => ({
        time: format(new Date(p.timestamp), config.formatStr),
        price: Number(p.close),
        high: Number(p.high),
        low: Number(p.low),
      }));

      if (points.length > 100) {
        const step = Math.ceil(points.length / 100);
        return points.filter((_, i) => i % step === 0);
      }

      return points;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

// New enhanced hook with custom time range and interval support
export function usePriceHistoryWithInterval(
  timeRange: CustomTimeRange,
  interval: DataInterval
): PriceHistoryResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["price-history-interval", timeRange.from.toISOString(), timeRange.to.toISOString(), interval],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_data")
        .select("timestamp, open, high, low, close, volume")
        .gte("timestamp", timeRange.from.toISOString())
        .lte("timestamp", timeRange.to.toISOString())
        .order("timestamp", { ascending: true });

      if (error) throw error;

      const priceData: PriceDataPoint[] = (data ?? []).map((row) => ({
        timestamp: row.timestamp,
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: row.volume ? Number(row.volume) : null,
      }));

      return aggregateByInterval(priceData, interval);
    },
    staleTime: 30000,
    refetchInterval: interval === "1m" || interval === "5m" ? 10000 : 60000,
  });

  const prices = data ?? [];

  const statistics: PriceStatistics | null = prices.length > 0 ? (() => {
    const priceValues = prices.map((p) => p.price);
    const min = Math.min(...priceValues);
    const max = Math.max(...priceValues);
    const avg = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const firstPrice = prices[0].price;
    const lastPrice = prices[prices.length - 1].price;
    const change = lastPrice - firstPrice;
    const changePercent = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

    return {
      count: prices.length,
      min,
      max,
      avg,
      firstDate: prices[0].date,
      lastDate: prices[prices.length - 1].date,
      change,
      changePercent,
    };
  })() : null;

  return {
    data: prices,
    statistics,
    isLoading,
    error: error as Error | null,
  };
}
