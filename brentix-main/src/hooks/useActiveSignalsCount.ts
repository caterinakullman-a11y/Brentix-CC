import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ActiveSignalsCountResult {
  count: number;
  isLoading: boolean;
  error: Error | null;
}

export function useActiveSignalsCount(): ActiveSignalsCountResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["active-signals-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("signals")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  return {
    count: data ?? 0,
    isLoading,
    error: error as Error | null,
  };
}
