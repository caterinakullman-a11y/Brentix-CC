import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "./useAuth";
import type {
  RecycleXRule,
  RecycleXPosition,
  RecycleXCycle,
  RecycleXSuggestion,
  RecycleXConfig,
  RecycleXState,
  CreateRecycleXRuleInput,
  UpdateRecycleXRuleInput,
} from "@/types/recyclex";
import { DEFAULT_RECYCLEX_CONFIG, DEFAULT_RECYCLEX_STATE } from "@/types/recyclex";

// ============================================
// Query Hooks
// ============================================

export function useRecycleXRules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recyclex-rules", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("recyclex_rules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((rule) => ({
        ...rule,
        config: rule.config as unknown as RecycleXConfig,
        state: rule.state as unknown as RecycleXState,
      })) as RecycleXRule[];
    },
    enabled: !!user?.id,
  });
}

export function useRecycleXRule(id: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recyclex-rule", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("recyclex_rules")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return {
        ...data,
        config: data.config as unknown as RecycleXConfig,
        state: data.state as unknown as RecycleXState,
      } as RecycleXRule;
    },
    enabled: !!user?.id && !!id,
  });
}

export function useRecycleXPositions(ruleId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recyclex-positions", ruleId],
    queryFn: async () => {
      if (!ruleId) return [];

      const { data, error } = await supabase
        .from("recyclex_positions")
        .select("*")
        .eq("rule_id", ruleId)
        .order("order_index", { ascending: true });

      if (error) throw error;

      return data as RecycleXPosition[];
    },
    enabled: !!user?.id && !!ruleId,
  });
}

export function useRecycleXCycles(ruleId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recyclex-cycles", ruleId],
    queryFn: async () => {
      if (!ruleId) return [];

      const { data, error } = await supabase
        .from("recyclex_cycles")
        .select("*")
        .eq("rule_id", ruleId)
        .order("cycle_number", { ascending: false });

      if (error) throw error;

      return data as RecycleXCycle[];
    },
    enabled: !!user?.id && !!ruleId,
  });
}

export function useRecycleXSuggestions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recyclex-suggestions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("recyclex_suggestions")
        .select("*")
        .eq("dismissed", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data as RecycleXSuggestion[];
    },
    enabled: !!user?.id,
  });
}

// ============================================
// Mutation Hooks
// ============================================

export function useCreateRecycleXRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateRecycleXRuleInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Merge input config with defaults
      const config: RecycleXConfig = {
        ...DEFAULT_RECYCLEX_CONFIG,
        ...input.config,
      };

      // Initialize state with capital
      const state: RecycleXState = {
        ...DEFAULT_RECYCLEX_STATE,
        initialCapital: config.capital,
        currentCapital: config.capital,
      };

      const { data, error } = await supabase
        .from("recyclex_rules")
        .insert([{
          user_id: user.id,
          name: input.name,
          type: input.type,
          start_mode: input.start_mode,
          auto_start_price: input.auto_start_price,
          auto_start_tolerance: input.auto_start_tolerance ?? 0.2,
          config: config as unknown as Json,
          state: state as unknown as Json,
          status: input.start_mode === 'AUTO' ? 'WAITING' : 'INACTIVE',
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recyclex-rules"] });
    },
  });
}

export function useUpdateRecycleXRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateRecycleXRuleInput) => {
      const updates: Record<string, Json | string | number | boolean | null | undefined> = {};

      if (input.name !== undefined) updates.name = input.name;
      if (input.status !== undefined) updates.status = input.status;
      if (input.auto_start_price !== undefined) updates.auto_start_price = input.auto_start_price;
      if (input.auto_start_tolerance !== undefined) updates.auto_start_tolerance = input.auto_start_tolerance;
      if (input.config !== undefined) updates.config = input.config as unknown as Json;
      if (input.state !== undefined) updates.state = input.state as unknown as Json;

      const { data, error } = await supabase
        .from("recyclex_rules")
        .update(updates)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recyclex-rules"] });
      queryClient.invalidateQueries({ queryKey: ["recyclex-rule", variables.id] });
    },
  });
}

export function useDeleteRecycleXRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recyclex_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recyclex-rules"] });
    },
  });
}

export function useStartRecycleXRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, referencePrice }: { id: string; referencePrice?: number }) => {
      // First get the current rule to update config
      const { data: rule, error: fetchError } = await supabase
        .from("recyclex_rules")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const config = rule.config as unknown as RecycleXConfig;
      const state = rule.state as unknown as RecycleXState;

      // Update config with reference price if provided
      const updatedConfig = {
        ...config,
        referencePrice: referencePrice ?? config.referencePrice,
      };

      // Update state
      const updatedState = {
        ...state,
        currentCycle: 1,
        initialCapital: config.capital,
        currentCapital: config.capital,
      };

      const { data, error } = await supabase
        .from("recyclex_rules")
        .update({
          status: 'ACTIVE',
          config: updatedConfig as unknown as Json,
          state: updatedState as unknown as Json,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recyclex-rules"] });
      queryClient.invalidateQueries({ queryKey: ["recyclex-rule", variables.id] });
    },
  });
}

export function usePauseRecycleXRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("recyclex_rules")
        .update({ status: 'PAUSED' })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["recyclex-rules"] });
      queryClient.invalidateQueries({ queryKey: ["recyclex-rule", id] });
    },
  });
}

export function useResumeRecycleXRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("recyclex_rules")
        .update({ status: 'ACTIVE' })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["recyclex-rules"] });
      queryClient.invalidateQueries({ queryKey: ["recyclex-rule", id] });
    },
  });
}

export function useStopRecycleXRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("recyclex_rules")
        .update({ status: 'STOPPED' })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["recyclex-rules"] });
      queryClient.invalidateQueries({ queryKey: ["recyclex-rule", id] });
    },
  });
}

export function useToggleRecycleXRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'PAUSED' }) => {
      const { data, error } = await supabase
        .from("recyclex_rules")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recyclex-rules"] });
      queryClient.invalidateQueries({ queryKey: ["recyclex-rule", variables.id] });
    },
  });
}

// ============================================
// Suggestion Mutations
// ============================================

export function useAcceptRecycleXSuggestion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const createRule = useCreateRecycleXRule();

  return useMutation({
    mutationFn: async ({ suggestionId, modifications }: {
      suggestionId: string;
      modifications?: Partial<CreateRecycleXRuleInput>
    }) => {
      // Get the suggestion
      const { data: suggestion, error: fetchError } = await supabase
        .from("recyclex_suggestions")
        .select("*")
        .eq("id", suggestionId)
        .single();

      if (fetchError) throw fetchError;

      // Create the rule based on suggestion
      const config = {
        ...DEFAULT_RECYCLEX_CONFIG,
        ...suggestion.suggested_config,
        ...modifications?.config,
      };

      const newRule = await createRule.mutateAsync({
        name: modifications?.name ?? `RecycleX ${suggestion.suggested_type}`,
        type: suggestion.suggested_type,
        start_mode: modifications?.start_mode ?? 'MANUAL',
        auto_start_price: modifications?.auto_start_price,
        config,
      });

      // Mark suggestion as dismissed
      await supabase
        .from("recyclex_suggestions")
        .update({ dismissed: true })
        .eq("id", suggestionId);

      // Link the rules together
      if (suggestion.triggered_by) {
        await supabase
          .from("recyclex_rules")
          .update({ linked_rule_id: newRule.id })
          .eq("id", suggestion.triggered_by);

        await supabase
          .from("recyclex_rules")
          .update({ linked_rule_id: suggestion.triggered_by })
          .eq("id", newRule.id);
      }

      return newRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recyclex-rules"] });
      queryClient.invalidateQueries({ queryKey: ["recyclex-suggestions"] });
    },
  });
}

export function useDismissRecycleXSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recyclex_suggestions")
        .update({ dismissed: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recyclex-suggestions"] });
    },
  });
}

// ============================================
// Helper Hook: Create Suggestion for Counterpart
// ============================================

export function useCreateCounterpartSuggestion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ ruleId, ruleType, config }: {
      ruleId: string;
      ruleType: 'BULL' | 'BEAR';
      config: RecycleXConfig;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const counterpartType = ruleType === 'BULL' ? 'BEAR' : 'BULL';
      const message = counterpartType === 'BEAR'
        ? `Du har aktiverat RecycleX Bull. Vill du även aktivera RecycleX Bear för att handla i båda riktningar?`
        : `Du har aktiverat RecycleX Bear. Vill du även aktivera RecycleX Bull för att handla i båda riktningar?`;

      const { data, error } = await supabase
        .from("recyclex_suggestions")
        .insert([{
          user_id: user.id,
          triggered_by: ruleId,
          suggested_type: counterpartType,
          suggested_config: {
            capital: config.capital,
            targetPercent: config.targetPercent,
            stopLossPercent: config.stopLossPercent,
            targetCycles: config.targetCycles,
          } as unknown as Json,
          message,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recyclex-suggestions"] });
    },
  });
}
