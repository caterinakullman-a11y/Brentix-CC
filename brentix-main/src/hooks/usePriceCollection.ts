import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PriceCollectionStatus {
  id: string;
  job_name: string;
  is_active: boolean;
  last_successful_run: string | null;
  last_error: string | null;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  created_at: string;
  updated_at: string;
}

export function usePriceCollectionStatus() {
  return useQuery({
    queryKey: ["price-collection-status"],
    queryFn: async (): Promise<PriceCollectionStatus | null> => {
      const { data, error } = await supabase
        .from("price_collection_status")
        .select("*")
        .eq("job_name", "fetch-brent-price-every-minute")
        .single();

      if (error) {
        console.error("Error fetching price collection status:", error);
        return null;
      }

      return data as PriceCollectionStatus;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useTogglePriceCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enable: boolean): Promise<string> => {
      const { data, error } = await supabase.rpc("toggle_price_collection", {
        enable,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-collection-status"] });
    },
  });
}

export function useManualPriceFetch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; price?: number; error?: string }> => {
      const { data, error } = await supabase.functions.invoke("fetch-brent-price");

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate price data queries to show new data
      queryClient.invalidateQueries({ queryKey: ["price-data"] });
      queryClient.invalidateQueries({ queryKey: ["price-history"] });
    },
  });
}

export function usePriceDataCount() {
  return useQuery({
    queryKey: ["price-data-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("price_data")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useLatestPriceTimestamp() {
  return useQuery({
    queryKey: ["latest-price-timestamp"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_data")
        .select("timestamp")
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data?.timestamp ?? null;
    },
    refetchInterval: 30000,
  });
}
