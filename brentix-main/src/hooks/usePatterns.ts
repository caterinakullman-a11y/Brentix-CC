import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PatternOccurrence {
  id: string;
  pattern_type: string;
  pattern_name: string;
  start_date: string;
  end_date: string;
  confidence: number;
  direction: string;
  entry_price: number | null;
  target_price: number | null;
  stop_loss: number | null;
  outcome: string | null;
  actual_return_percent: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface PatternDefinition {
  id: string;
  pattern_type: string;
  name: string;
  description: string | null;
  category: string;
  direction: string;
  timeframe: string;
  parameters: Record<string, unknown>;
  is_active: boolean;
  success_rate: number | null;
  avg_return_percent: number | null;
}

export function usePatternDefinitions() {
  return useQuery({
    queryKey: ["pattern-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pattern_definitions")
        .select("*")
        .eq("is_active", true)
        .order("category");
      
      if (error) throw error;
      return data as PatternDefinition[];
    },
    staleTime: 60000 * 60, // 1 hour
  });
}

export function usePatternOccurrences(startDate?: string, endDate?: string, patternTypes?: string[]) {
  return useQuery({
    queryKey: ["pattern-occurrences", startDate, endDate, patternTypes],
    queryFn: async () => {
      let query = supabase
        .from("pattern_occurrences")
        .select("*")
        .order("end_date", { ascending: false });

      if (startDate) query = query.gte("end_date", startDate);
      if (endDate) query = query.lte("end_date", endDate);
      if (patternTypes && patternTypes.length > 0) {
        query = query.in("pattern_type", patternTypes);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as PatternOccurrence[];
    },
    staleTime: 60000, // 1 minute
  });
}

export function useDetectPatterns() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: { start_date?: string; end_date?: string }) => {
      const { data, error } = await supabase.functions.invoke("detect-patterns", {
        body: params || {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pattern-occurrences"] });
    },
  });
}

export function usePatternStats() {
  return useQuery({
    queryKey: ["pattern-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pattern_occurrences")
        .select("pattern_type, pattern_name, direction, outcome, confidence");

      if (error) throw error;

      // Calculate stats by pattern type
      const stats = (data as PatternOccurrence[]).reduce((acc, p) => {
        if (!acc[p.pattern_type]) {
          acc[p.pattern_type] = {
            pattern_type: p.pattern_type,
            pattern_name: p.pattern_name,
            total: 0,
            bullish: 0,
            bearish: 0,
            success: 0,
            failure: 0,
            pending: 0,
            avg_confidence: 0,
          };
        }
        acc[p.pattern_type].total++;
        if (p.direction === "BULLISH") acc[p.pattern_type].bullish++;
        if (p.direction === "BEARISH") acc[p.pattern_type].bearish++;
        if (p.outcome === "SUCCESS") acc[p.pattern_type].success++;
        if (p.outcome === "FAILURE") acc[p.pattern_type].failure++;
        if (p.outcome === "PENDING" || !p.outcome) acc[p.pattern_type].pending++;
        acc[p.pattern_type].avg_confidence += p.confidence;
        return acc;
      }, {} as Record<string, {
        pattern_type: string;
        pattern_name: string;
        total: number;
        bullish: number;
        bearish: number;
        success: number;
        failure: number;
        pending: number;
        avg_confidence: number;
      }>);

      // Calculate averages
      Object.values(stats).forEach(s => {
        s.avg_confidence = s.total > 0 ? s.avg_confidence / s.total : 0;
      });

      return Object.values(stats);
    },
    staleTime: 60000 * 5,
  });
}
