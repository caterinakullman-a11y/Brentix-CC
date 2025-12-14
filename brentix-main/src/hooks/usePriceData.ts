import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PriceData {
  id: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

interface PriceDataResult {
  currentPrice: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  isLoading: boolean;
  error: Error | null;
}

export function usePriceData(): PriceDataResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["price-data"],
    queryFn: async () => {
      // Fetch latest 2 rows to calculate change
      const { data, error } = await supabase
        .from("price_data")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(2);

      if (error) throw error;
      return data as PriceData[];
    },
    refetchInterval: 10000, // Poll every 10 seconds
    staleTime: 5000,
  });

  const latestPrice = data?.[0];
  const previousPrice = data?.[1];

  const currentPrice = latestPrice?.close ?? 0;
  const previousClose = previousPrice?.close ?? currentPrice;
  const change24h = currentPrice - previousClose;
  const changePercent24h = previousClose > 0 ? (change24h / previousClose) * 100 : 0;

  return {
    currentPrice,
    change24h,
    changePercent24h,
    high24h: latestPrice?.high ?? 0,
    low24h: latestPrice?.low ?? 0,
    volume: latestPrice?.volume ?? 0,
    isLoading,
    error: error as Error | null,
  };
}
