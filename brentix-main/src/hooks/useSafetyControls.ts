import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Json } from "@/integrations/supabase/types";

export interface EmergencyStop {
  id: string;
  user_id: string;
  is_active: boolean;
  triggered_at: string | null;
  reason: string | null;
  close_all_positions: boolean;
  disable_auto_trading: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutoTrigger {
  id: string;
  user_id: string;
  name: string;
  trigger_type: "MAX_DAILY_LOSS" | "MAX_POSITION_LOSS" | "MAX_DRAWDOWN" | "PROFIT_TARGET";
  threshold_value: number;
  threshold_type: "PERCENT" | "ABSOLUTE";
  action: "CLOSE_POSITION" | "CLOSE_ALL" | "STOP_TRADING" | "NOTIFY";
  is_active: boolean;
  triggered_count: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConditionalOrder {
  id: string;
  user_id: string;
  instrument_id: string | null;
  order_type: "LIMIT" | "STOP" | "STOP_LIMIT" | "TRAILING_STOP";
  direction: "BUY" | "SELL";
  trigger_price: number | null;
  limit_price: number | null;
  quantity: number;
  trailing_percent: number | null;
  status: "PENDING" | "TRIGGERED" | "EXECUTED" | "CANCELLED" | "EXPIRED";
  expires_at: string | null;
  triggered_at: string | null;
  executed_at: string | null;
  execution_result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export function useEmergencyStop() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["emergency-stop", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("emergency_stops")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as EmergencyStop | null;
    },
    enabled: !!user?.id,
  });
}

export function useToggleEmergencyStop() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ activate, reason }: { activate: boolean; reason?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Check if record exists
      const { data: existing } = await supabase
        .from("emergency_stops")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("emergency_stops")
          .update({
            is_active: activate,
            triggered_at: activate ? new Date().toISOString() : null,
            reason: reason || null,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("emergency_stops")
          .insert({
            user_id: user.id,
            is_active: activate,
            triggered_at: activate ? new Date().toISOString() : null,
            reason: reason || null,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency-stop"] });
    },
  });
}

export function useAutoTriggers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["auto-triggers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("auto_triggers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AutoTrigger[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateAutoTrigger() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (trigger: Omit<AutoTrigger, "id" | "user_id" | "triggered_count" | "last_triggered_at" | "created_at" | "updated_at">) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("auto_triggers")
        .insert({
          user_id: user.id,
          ...trigger,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-triggers"] });
    },
  });
}

export function useToggleAutoTrigger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("auto_triggers")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-triggers"] });
    },
  });
}

export function useDeleteAutoTrigger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("auto_triggers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-triggers"] });
    },
  });
}

export function useConditionalOrders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conditional-orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("conditional_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ConditionalOrder[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateConditionalOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (order: Omit<ConditionalOrder, "id" | "user_id" | "status" | "triggered_at" | "executed_at" | "execution_result" | "created_at" | "updated_at">) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("conditional_orders")
        .insert({
          user_id: user.id,
          ...order,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conditional-orders"] });
    },
  });
}

export function useCancelConditionalOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("conditional_orders")
        .update({ status: "CANCELLED" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conditional-orders"] });
    },
  });
}
