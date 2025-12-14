import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Instrument {
  id: string;
  avanza_id: string;
  name: string;
  isin: string | null;
  type: "BULL" | "BEAR" | "ETF" | "STOCK";
  underlying_asset: string | null;
  leverage: number | null;
  issuer: string | null;
  currency: string;
  exchange: string | null;
  current_price: number | null;
  daily_change_percent: number | null;
  avg_volume_30d: number | null;
  spread_percent: number | null;
  correlation_30d: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InstrumentPair {
  id: string;
  bull_instrument_id: string;
  bear_instrument_id: string;
  correlation_score: number | null;
  leverage_match: boolean;
  issuer_match: boolean;
  volume_ratio: number | null;
  hedge_efficiency: number | null;
  recommended: boolean;
  bull_instrument?: Instrument;
  bear_instrument?: Instrument;
}

export interface UserInstrumentPair {
  id: string;
  user_id: string;
  primary_instrument_id: string;
  counterweight_instrument_id: string;
  is_active: boolean;
  primary_instrument?: Instrument;
  counterweight_instrument?: Instrument;
}

export function useInstruments(type?: "BULL" | "BEAR") {
  return useQuery({
    queryKey: ["instruments", type],
    queryFn: async () => {
      let query = supabase
        .from("instruments")
        .select("*")
        .eq("is_active", true)
        .order("leverage", { ascending: false });

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Instrument[];
    },
  });
}

export function useInstrumentPairs() {
  return useQuery({
    queryKey: ["instrument-pairs"],
    queryFn: async () => {
      // First get the pairs
      const { data: pairs, error: pairsError } = await supabase
        .from("instrument_pairs")
        .select("*")
        .order("correlation_score", { ascending: false });

      if (pairsError) throw pairsError;
      if (!pairs) return [];

      // Then get all instruments
      const { data: instruments, error: instError } = await supabase
        .from("instruments")
        .select("*");

      if (instError) throw instError;

      // Map instruments to pairs
      return pairs.map((pair) => ({
        ...pair,
        bull_instrument: instruments?.find((i) => i.id === pair.bull_instrument_id),
        bear_instrument: instruments?.find((i) => i.id === pair.bear_instrument_id),
      })) as InstrumentPair[];
    },
  });
}

export function useUserInstrumentPairs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-instrument-pairs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user pairs
      const { data: userPairs, error: pairsError } = await supabase
        .from("user_instrument_pairs")
        .select("*")
        .eq("is_active", true);

      if (pairsError) throw pairsError;
      if (!userPairs || userPairs.length === 0) return [];

      // Get instruments
      const { data: instruments, error: instError } = await supabase
        .from("instruments")
        .select("*");

      if (instError) throw instError;

      // Map instruments to pairs
      return userPairs.map((pair) => ({
        ...pair,
        primary_instrument: instruments?.find((i) => i.id === pair.primary_instrument_id),
        counterweight_instrument: instruments?.find((i) => i.id === pair.counterweight_instrument_id),
      })) as UserInstrumentPair[];
    },
    enabled: !!user?.id,
  });
}

export function useSetUserPair() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      primaryId,
      counterweightId,
    }: {
      primaryId: string;
      counterweightId: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Deactivate existing pairs
      await supabase
        .from("user_instrument_pairs")
        .update({ is_active: false })
        .eq("user_id", user.id);

      // Insert new pair
      const { data, error } = await supabase
        .from("user_instrument_pairs")
        .insert({
          user_id: user.id,
          primary_instrument_id: primaryId,
          counterweight_instrument_id: counterweightId,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-instrument-pairs"] });
    },
  });
}

export function useRemoveUserPair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pairId: string) => {
      const { error } = await supabase
        .from("user_instrument_pairs")
        .delete()
        .eq("id", pairId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-instrument-pairs"] });
    },
  });
}
