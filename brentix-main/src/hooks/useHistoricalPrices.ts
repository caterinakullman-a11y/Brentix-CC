import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, subYears, startOfYear } from "date-fns";

export type DateRangePreset = "1M" | "3M" | "6M" | "1Y" | "5Y" | "10Y" | "ALL";

interface HistoricalPrice {
  id: string;
  date: string;
  price: number;
  source: string;
  series_id: string;
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

function getStartDate(preset: DateRangePreset): Date | null {
  const now = new Date();
  switch (preset) {
    case "1M":
      return subMonths(now, 1);
    case "3M":
      return subMonths(now, 3);
    case "6M":
      return subMonths(now, 6);
    case "1Y":
      return subYears(now, 1);
    case "5Y":
      return subYears(now, 5);
    case "10Y":
      return subYears(now, 10);
    case "ALL":
      return null;
  }
}

export function useHistoricalPrices(preset: DateRangePreset) {
  const startDate = getStartDate(preset);

  const { data, isLoading, error } = useQuery({
    queryKey: ["historical-prices", preset],
    queryFn: async () => {
      let query = supabase
        .from("historical_prices")
        .select("*")
        .order("date", { ascending: true });

      if (startDate) {
        query = query.gte("date", startDate.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as HistoricalPrice[];
    },
    staleTime: 60000 * 5, // 5 minutes
  });

  const prices = data ?? [];

  // Calculate statistics
  const statistics: PriceStatistics | null = prices.length > 0 ? (() => {
    const priceValues = prices.map((p) => p.price);
    const min = Math.min(...priceValues);
    const max = Math.max(...priceValues);
    const avg = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const firstPrice = prices[0].price;
    const lastPrice = prices[prices.length - 1].price;
    const change = lastPrice - firstPrice;
    const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;

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
    prices,
    statistics,
    isLoading,
    error: error as Error | null,
  };
}

export function useImportHistoricalData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-historical-data");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historical-prices"] });
    },
  });
}

export function useHistoricalDataCount() {
  return useQuery({
    queryKey: ["historical-prices-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("historical_prices")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}
