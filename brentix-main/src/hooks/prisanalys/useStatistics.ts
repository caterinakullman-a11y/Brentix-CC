import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HourlyStats {
  hour_of_day: number;
  avg_price: number;
  avg_price_change: number;
  avg_price_change_percent: number;
  avg_volume: number;
  avg_range: number;
  sample_count: number;
  up_count: number;
  down_count: number;
  up_probability: number;
  avg_up_move: number;
  avg_down_move: number;
}

export interface DailyStats {
  day_of_week: number;
  day_name: string;
  avg_price: number;
  avg_price_change: number;
  avg_price_change_percent: number;
  avg_volume: number;
  avg_range: number;
  sample_count: number;
  up_probability: number;
  volatility: number;
}

export interface PriceStats {
  total_records: number;
  min_price: number;
  max_price: number;
  avg_price: number;
  price_std_dev: number;
  total_volume: number;
  avg_daily_range: number;
  up_days: number;
  down_days: number;
  unchanged_days: number;
  max_up_move: number;
  max_down_move: number;
  avg_up_move: number;
  avg_down_move: number;
}

export interface HeatmapCell {
  day_of_week: number;
  hour_of_day: number;
  avg_price_change_percent: number;
  up_probability: number;
  sample_count: number;
}

interface StatisticsOptions {
  startDate?: Date;
  endDate?: Date;
}

interface UseStatisticsResult {
  hourlyStats: HourlyStats[];
  dailyStats: DailyStats[];
  priceStats: PriceStats | null;
  heatmapData: HeatmapCell[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useStatistics(
  options: StatisticsOptions = {}
): UseStatisticsResult {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days default
    endDate = new Date(),
  } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["prisanalys-statistics", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      // Fetch price data for the period
      const { data: priceData, error: priceError } = await supabase
        .from("price_data")
        .select("*")
        .gte("timestamp", startDate.toISOString())
        .lte("timestamp", endDate.toISOString())
        .order("timestamp", { ascending: true });

      if (priceError) throw priceError;

      if (!priceData || priceData.length === 0) {
        return {
          hourlyStats: [],
          dailyStats: [],
          priceStats: null,
          heatmapData: [],
        };
      }

      // Calculate hourly statistics
      const hourlyMap = new Map<number, {
        prices: number[];
        changes: number[];
        volumes: number[];
        ranges: number[];
        upMoves: number[];
        downMoves: number[];
      }>();

      for (let i = 0; i < 24; i++) {
        hourlyMap.set(i, { prices: [], changes: [], volumes: [], ranges: [], upMoves: [], downMoves: [] });
      }

      priceData.forEach((row) => {
        const hour = new Date(row.timestamp).getHours();
        const stats = hourlyMap.get(hour)!;
        stats.prices.push(row.close);
        const change = row.close - row.open;
        stats.changes.push(change);
        stats.volumes.push(row.volume ?? 0);
        stats.ranges.push(row.high - row.low);
        if (change > 0) stats.upMoves.push(change);
        if (change < 0) stats.downMoves.push(Math.abs(change));
      });

      const hourlyStats: HourlyStats[] = [];
      hourlyMap.forEach((stats, hour) => {
        if (stats.prices.length > 0) {
          const avgPrice = stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length;
          const avgChange = stats.changes.reduce((a, b) => a + b, 0) / stats.changes.length;
          const avgVolume = stats.volumes.reduce((a, b) => a + b, 0) / stats.volumes.length;
          const avgRange = stats.ranges.reduce((a, b) => a + b, 0) / stats.ranges.length;
          const upCount = stats.upMoves.length;
          const downCount = stats.downMoves.length;
          const avgUpMove = upCount > 0 ? stats.upMoves.reduce((a, b) => a + b, 0) / upCount : 0;
          const avgDownMove = downCount > 0 ? stats.downMoves.reduce((a, b) => a + b, 0) / downCount : 0;

          hourlyStats.push({
            hour_of_day: hour,
            avg_price: avgPrice,
            avg_price_change: avgChange,
            avg_price_change_percent: avgPrice > 0 ? (avgChange / avgPrice) * 100 : 0,
            avg_volume: avgVolume,
            avg_range: avgRange,
            sample_count: stats.prices.length,
            up_count: upCount,
            down_count: downCount,
            up_probability: (upCount / stats.prices.length) * 100,
            avg_up_move: avgUpMove,
            avg_down_move: avgDownMove,
          });
        }
      });

      // Calculate daily statistics
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dailyMap = new Map<number, {
        prices: number[];
        changes: number[];
        volumes: number[];
        ranges: number[];
      }>();

      for (let i = 0; i < 7; i++) {
        dailyMap.set(i, { prices: [], changes: [], volumes: [], ranges: [] });
      }

      priceData.forEach((row) => {
        const day = new Date(row.timestamp).getDay();
        const stats = dailyMap.get(day)!;
        stats.prices.push(row.close);
        stats.changes.push(row.close - row.open);
        stats.volumes.push(row.volume ?? 0);
        stats.ranges.push(row.high - row.low);
      });

      const dailyStats: DailyStats[] = [];
      dailyMap.forEach((stats, day) => {
        if (stats.prices.length > 0) {
          const avgPrice = stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length;
          const avgChange = stats.changes.reduce((a, b) => a + b, 0) / stats.changes.length;
          const avgVolume = stats.volumes.reduce((a, b) => a + b, 0) / stats.volumes.length;
          const avgRange = stats.ranges.reduce((a, b) => a + b, 0) / stats.ranges.length;
          const upCount = stats.changes.filter((c) => c > 0).length;

          // Calculate volatility (standard deviation of changes)
          const mean = avgChange;
          const squaredDiffs = stats.changes.map((c) => Math.pow(c - mean, 2));
          const volatility = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / stats.changes.length);

          dailyStats.push({
            day_of_week: day,
            day_name: dayNames[day],
            avg_price: avgPrice,
            avg_price_change: avgChange,
            avg_price_change_percent: avgPrice > 0 ? (avgChange / avgPrice) * 100 : 0,
            avg_volume: avgVolume,
            avg_range: avgRange,
            sample_count: stats.prices.length,
            up_probability: (upCount / stats.prices.length) * 100,
            volatility,
          });
        }
      });

      // Calculate overall price statistics
      const allPrices = priceData.map((row) => row.close);
      const allChanges = priceData.map((row) => row.close - row.open);
      const allVolumes = priceData.map((row) => row.volume ?? 0);
      const allRanges = priceData.map((row) => row.high - row.low);

      const avgPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
      const squaredDiffs = allPrices.map((p) => Math.pow(p - avgPrice, 2));
      const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / allPrices.length);

      const upChanges = allChanges.filter((c) => c > 0);
      const downChanges = allChanges.filter((c) => c < 0);

      const priceStats: PriceStats = {
        total_records: priceData.length,
        min_price: Math.min(...allPrices),
        max_price: Math.max(...allPrices),
        avg_price: avgPrice,
        price_std_dev: stdDev,
        total_volume: allVolumes.reduce((a, b) => a + b, 0),
        avg_daily_range: allRanges.reduce((a, b) => a + b, 0) / allRanges.length,
        up_days: upChanges.length,
        down_days: downChanges.length,
        unchanged_days: allChanges.filter((c) => c === 0).length,
        max_up_move: upChanges.length > 0 ? Math.max(...upChanges) : 0,
        max_down_move: downChanges.length > 0 ? Math.max(...downChanges.map(Math.abs)) : 0,
        avg_up_move: upChanges.length > 0 ? upChanges.reduce((a, b) => a + b, 0) / upChanges.length : 0,
        avg_down_move: downChanges.length > 0 ? Math.abs(downChanges.reduce((a, b) => a + b, 0)) / downChanges.length : 0,
      };

      // Calculate heatmap data (day x hour)
      const heatmapMap = new Map<string, { changes: number[]; prices: number[] }>();

      priceData.forEach((row) => {
        const date = new Date(row.timestamp);
        const day = date.getDay();
        const hour = date.getHours();
        const key = `${day}-${hour}`;

        if (!heatmapMap.has(key)) {
          heatmapMap.set(key, { changes: [], prices: [] });
        }

        const cell = heatmapMap.get(key)!;
        cell.changes.push(row.close - row.open);
        cell.prices.push(row.close);
      });

      const heatmapData: HeatmapCell[] = [];
      heatmapMap.forEach((stats, key) => {
        const [day, hour] = key.split("-").map(Number);
        const avgChange = stats.changes.reduce((a, b) => a + b, 0) / stats.changes.length;
        const avgPrice = stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length;
        const upCount = stats.changes.filter((c) => c > 0).length;

        heatmapData.push({
          day_of_week: day,
          hour_of_day: hour,
          avg_price_change_percent: avgPrice > 0 ? (avgChange / avgPrice) * 100 : 0,
          up_probability: (upCount / stats.changes.length) * 100,
          sample_count: stats.changes.length,
        });
      });

      return {
        hourlyStats: hourlyStats.sort((a, b) => a.hour_of_day - b.hour_of_day),
        dailyStats: dailyStats.sort((a, b) => a.day_of_week - b.day_of_week),
        priceStats,
        heatmapData: heatmapData.sort((a, b) => a.day_of_week * 24 + a.hour_of_day - (b.day_of_week * 24 + b.hour_of_day)),
      };
    },
    staleTime: 60000, // 1 minute
  });

  return {
    hourlyStats: data?.hourlyStats ?? [],
    dailyStats: data?.dailyStats ?? [],
    priceStats: data?.priceStats ?? null,
    heatmapData: data?.heatmapData ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
