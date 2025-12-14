import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface ExportParams {
  dateFrom: string;
  dateTo: string;
  resolution: "second" | "minute" | "hour" | "day";
  format: "csv" | "json";
}

export interface DataExport {
  id: string;
  user_id: string;
  export_type: string;
  date_from: string;
  date_to: string;
  resolution: string;
  file_size_bytes: number | null;
  record_count: number | null;
  download_url: string | null;
  expires_at: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export function useDataExport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch previous exports
  const { data: exports, isLoading } = useQuery({
    queryKey: ["data-exports", user?.id],
    queryFn: async (): Promise<DataExport[]> => {
      const { data, error } = await supabase
        .from("data_exports")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as DataExport[];
    },
    enabled: !!user?.id,
  });

  // Create new export
  const createExport = useMutation({
    mutationFn: async (params: ExportParams) => {
      const { data, error } = await supabase.functions.invoke("export-price-data", {
        body: {
          userId: user?.id,
          ...params,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["data-exports"] });
      queryClient.invalidateQueries({ queryKey: ["storage-status"] });
      
      toast({
        title: "✅ Export klar",
        description: `${data.recordCount} datapunkter exporterade.`,
      });

      // Open download link
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      }
    },
    onError: (error) => {
      toast({
        title: "❌ Export misslyckades",
        description: error instanceof Error ? error.message : "Ett fel uppstod",
        variant: "destructive",
      });
    },
  });

  return {
    exports,
    isLoading,
    createExport: createExport.mutate,
    isExporting: createExport.isPending,
  };
}
