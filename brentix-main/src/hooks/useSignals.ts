import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type SignalType = "BUY" | "SELL" | "HOLD";
type SignalStrength = "STRONG" | "MODERATE" | "WEAK";

interface Signal {
  id: string;
  timestamp: string;
  signal_type: SignalType;
  strength: SignalStrength;
  probability_up: number;
  probability_down: number;
  confidence: number;
  current_price: number;
  target_price: number | null;
  stop_loss: number | null;
  reasoning: string | null;
  is_active: boolean;
  auto_executed: boolean | null;
  executed_at: string | null;
  execution_result: Record<string, unknown> | null;
}

interface ActiveSignalResult {
  signal: Signal | null;
  isLoading: boolean;
  error: Error | null;
}

export function useActiveSignal(): ActiveSignalResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["active-signal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signals")
        .select("*")
        .eq("is_active", true)
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Signal | null;
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });

  return {
    signal: data ?? null,
    isLoading,
    error: error as Error | null,
  };
}

interface RecentSignalsResult {
  signals: Signal[];
  isLoading: boolean;
  error: Error | null;
}

export function useRecentSignals(limit: number = 5): RecentSignalsResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["recent-signals", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signals")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Signal[];
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  return {
    signals: data ?? [],
    isLoading,
    error: error as Error | null,
  };
}
