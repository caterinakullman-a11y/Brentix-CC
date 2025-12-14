import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface StorageStatus {
  currentBytes: number;
  maxBytes: number;
  usedPercent: number;
  warningThreshold: number;
  isWarning: boolean;
  isCritical: boolean;
  backfillCompleted: boolean;
  backfillRecords: number;
  lastExport: string | null;
  totalExports: number;
}

export function useStorageStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["storage-status"],
    queryFn: async (): Promise<StorageStatus> => {
      const { data, error } = await supabase
        .from("storage_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;

      const usedPercent = data.max_storage_bytes > 0 
        ? (data.current_storage_bytes / data.max_storage_bytes) * 100 
        : 0;

      return {
        currentBytes: data.current_storage_bytes || 0,
        maxBytes: data.max_storage_bytes || 104857600,
        usedPercent,
        warningThreshold: data.warning_threshold_percent || 80,
        isWarning: usedPercent >= (data.warning_threshold_percent || 80),
        isCritical: usedPercent >= 95,
        backfillCompleted: data.backfill_completed || false,
        backfillRecords: data.backfill_records_imported || 0,
        lastExport: data.last_export_at,
        totalExports: data.total_exports || 0,
      };
    },
    refetchInterval: 60000, // Update every minute
  });

  // Show warning toast when storage is high
  useEffect(() => {
    if (!status) return;

    if (status.isCritical) {
      toast({
        title: "🚨 Kritiskt lagringsutrymme",
        description: `${status.usedPercent.toFixed(1)}% av lagringsutrymmet används! Exportera data omedelbart.`,
        variant: "destructive",
      });
    } else if (status.isWarning) {
      toast({
        title: "⚠️ Lagringsutrymme",
        description: `${status.usedPercent.toFixed(1)}% av lagringsutrymmet används. Överväg att exportera och rensa data.`,
      });
    }
  }, [status?.isWarning, status?.isCritical, status?.usedPercent, toast]);

  // Update storage limit
  const updateLimit = useMutation({
    mutationFn: async (newLimitMB: number) => {
      const { error } = await supabase
        .from("storage_settings")
        .update({ 
          max_storage_bytes: newLimitMB * 1024 * 1024,
          updated_at: new Date().toISOString()
        })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Update all rows

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storage-status"] });
      toast({
        title: "✅ Lagringsgräns uppdaterad",
        description: "Den nya gränsen har sparats.",
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Fel",
        description: error instanceof Error ? error.message : "Kunde inte uppdatera lagringsgränsen",
        variant: "destructive",
      });
    },
  });

  // Run backfill
  const runBackfill = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("backfill-yahoo-data");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["storage-status"] });
      toast({
        title: "✅ Backfill klar",
        description: `${data.records_imported} datapunkter importerade.`,
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Backfill misslyckades",
        description: error instanceof Error ? error.message : "Ett fel uppstod",
        variant: "destructive",
      });
    },
  });

  // Recalculate storage
  const recalculateStorage = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("calculate_storage_usage");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storage-status"] });
      toast({
        title: "✅ Lagringsberäkning klar",
        description: "Lagringsutrymmet har beräknats om.",
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Beräkningsfel",
        description: error instanceof Error ? error.message : "Kunde inte beräkna lagringsutrymme",
        variant: "destructive",
      });
    },
  });

  return {
    status,
    isLoading,
    refetch,
    updateLimit: updateLimit.mutate,
    isUpdatingLimit: updateLimit.isPending,
    runBackfill: runBackfill.mutate,
    isBackfilling: runBackfill.isPending,
    recalculateStorage: recalculateStorage.mutate,
    isRecalculating: recalculateStorage.isPending,
  };
}

// Helper function to format bytes
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
