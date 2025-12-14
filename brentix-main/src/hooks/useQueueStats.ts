import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface QueueItem {
  id: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  error_message: string | null;
  signals: {
    signal_type: string;
    current_price: number;
  } | null;
}

export function useQueueStats() {
  return useQuery({
    queryKey: ["queue-stats"],
    queryFn: async (): Promise<QueueStats> => {
      const { data, error } = await supabase
        .from("trade_execution_queue")
        .select("status");

      if (error) throw error;

      const pending = data?.filter((d) => d.status === "PENDING").length || 0;
      const processing = data?.filter((d) => d.status === "PROCESSING").length || 0;
      const completed = data?.filter((d) => d.status === "COMPLETED").length || 0;
      const failed = data?.filter((d) => d.status === "FAILED").length || 0;

      return { pending, processing, completed, failed };
    },
    refetchInterval: 10000,
  });
}

export function useRecentQueue(limit: number = 5) {
  return useQuery({
    queryKey: ["recent-queue", limit],
    queryFn: async (): Promise<QueueItem[]> => {
      const { data, error } = await supabase
        .from("trade_execution_queue")
        .select(`
          id,
          status,
          created_at,
          processed_at,
          error_message,
          signals (signal_type, current_price)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as QueueItem[];
    },
    refetchInterval: 10000,
  });
}

export function useClearFailedQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("trade_execution_queue")
        .delete()
        .eq("status", "FAILED");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-queue"] });
    },
  });
}
