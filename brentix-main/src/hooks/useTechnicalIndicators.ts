import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TechnicalIndicator {
  id: string;
  timestamp: string;
  rsi_14: number | null;
  macd: number | null;
  macd_signal: number | null;
  macd_histogram: number | null;
  sma_5: number | null;
  sma_20: number | null;
  sma_50: number | null;
  ema_12: number | null;
  ema_26: number | null;
  bollinger_upper: number | null;
  bollinger_middle: number | null;
  bollinger_lower: number | null;
  atr_14: number | null;
}

interface IndicatorsResult {
  indicators: TechnicalIndicator | null;
  isLoading: boolean;
  error: Error | null;
}

export function useTechnicalIndicators(): IndicatorsResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["technical-indicators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technical_indicators")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as TechnicalIndicator | null;
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });

  return {
    indicators: data ?? null,
    isLoading,
    error: error as Error | null,
  };
}
