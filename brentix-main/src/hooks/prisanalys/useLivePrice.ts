import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PriceDataRow {
  id: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  source: string | null;
}

interface LivePriceResult {
  currentPrice: number;
  previousPrice: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string | null;
  change1m: number;
  change5m: number;
  change15m: number;
  change1h: number;
  change24h: number;
  changePercent1m: number;
  changePercent5m: number;
  changePercent15m: number;
  changePercent1h: number;
  changePercent24h: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLivePrice(): LivePriceResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["prisanalys-live-price"],
    queryFn: async () => {
      // Fetch data for different time periods
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Fetch latest price
      const { data: latestData, error: latestError } = await supabase
        .from("price_data")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(1);

      if (latestError) throw latestError;

      // Fetch historical prices for change calculations
      const { data: historicalData, error: historicalError } = await supabase
        .from("price_data")
        .select("timestamp, close")
        .or(
          `timestamp.lte.${oneMinuteAgo.toISOString()},timestamp.lte.${fiveMinutesAgo.toISOString()},timestamp.lte.${fifteenMinutesAgo.toISOString()},timestamp.lte.${oneHourAgo.toISOString()},timestamp.lte.${oneDayAgo.toISOString()}`
        )
        .order("timestamp", { ascending: false })
        .limit(100);

      if (historicalError) throw historicalError;

      // Find closest prices to each time period
      const findClosestPrice = (targetTime: Date): number | null => {
        if (!historicalData || historicalData.length === 0) return null;
        const targetTs = targetTime.getTime();
        let closest: { timestamp: string; close: number } | null = null;
        let minDiff = Infinity;

        for (const row of historicalData) {
          const rowTs = new Date(row.timestamp).getTime();
          const diff = Math.abs(rowTs - targetTs);
          if (diff < minDiff && rowTs <= targetTs) {
            minDiff = diff;
            closest = row;
          }
        }
        return closest?.close ?? null;
      };

      return {
        latest: latestData?.[0] as PriceDataRow | undefined,
        price1mAgo: findClosestPrice(oneMinuteAgo),
        price5mAgo: findClosestPrice(fiveMinutesAgo),
        price15mAgo: findClosestPrice(fifteenMinutesAgo),
        price1hAgo: findClosestPrice(oneHourAgo),
        price24hAgo: findClosestPrice(oneDayAgo),
      };
    },
    refetchInterval: 5000, // Poll every 5 seconds for live data
    staleTime: 3000,
  });

  const currentPrice = data?.latest?.close ?? 0;
  const previousPrice = data?.price1mAgo ?? currentPrice;

  const calculateChange = (oldPrice: number | null): number => {
    if (!oldPrice || oldPrice === 0) return 0;
    return currentPrice - oldPrice;
  };

  const calculateChangePercent = (oldPrice: number | null): number => {
    if (!oldPrice || oldPrice === 0) return 0;
    return ((currentPrice - oldPrice) / oldPrice) * 100;
  };

  return {
    currentPrice,
    previousPrice,
    open: data?.latest?.open ?? 0,
    high: data?.latest?.high ?? 0,
    low: data?.latest?.low ?? 0,
    volume: data?.latest?.volume ?? 0,
    timestamp: data?.latest?.timestamp ?? null,
    change1m: calculateChange(data?.price1mAgo ?? null),
    change5m: calculateChange(data?.price5mAgo ?? null),
    change15m: calculateChange(data?.price15mAgo ?? null),
    change1h: calculateChange(data?.price1hAgo ?? null),
    change24h: calculateChange(data?.price24hAgo ?? null),
    changePercent1m: calculateChangePercent(data?.price1mAgo ?? null),
    changePercent5m: calculateChangePercent(data?.price5mAgo ?? null),
    changePercent15m: calculateChangePercent(data?.price15mAgo ?? null),
    changePercent1h: calculateChangePercent(data?.price1hAgo ?? null),
    changePercent24h: calculateChangePercent(data?.price24hAgo ?? null),
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
