import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useRealtimeSubscriptions() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to price_data changes
    const priceChannel = supabase
      .channel('price-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'price_data'
        },
        (payload) => {
          console.log('New price data:', payload);
          queryClient.invalidateQueries({ queryKey: ['price-data'] });
        }
      )
      .subscribe();

    // Subscribe to signals changes
    const signalsChannel = supabase
      .channel('signal-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals'
        },
        (payload) => {
          console.log('New signal:', payload);
          queryClient.invalidateQueries({ queryKey: ['active-signal'] });
          queryClient.invalidateQueries({ queryKey: ['recent-signals'] });
          queryClient.invalidateQueries({ queryKey: ['active-signals-count'] });
          
          const signal = payload.new as { signal_type: string; is_active: boolean };
          if (signal.is_active) {
            toast({
              title: `New ${signal.signal_type} Signal`,
              description: "A new trading signal has been generated",
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to trades changes
    const tradesChannel = supabase
      .channel('trades-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades'
        },
        (payload) => {
          console.log('Trade update:', payload);
          queryClient.invalidateQueries({ queryKey: ['today-stats'] });
        }
      )
      .subscribe();

    // Subscribe to technical_indicators changes
    const indicatorsChannel = supabase
      .channel('indicators-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'technical_indicators'
        },
        (payload) => {
          console.log('New indicators:', payload);
          queryClient.invalidateQueries({ queryKey: ['technical-indicators'] });
        }
      )
      .subscribe();

    // Subscribe to instruments changes (for real-time price updates)
    const instrumentsChannel = supabase
      .channel('instruments-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'instruments'
        },
        (payload) => {
          console.log('Instrument update:', payload);
          queryClient.invalidateQueries({ queryKey: ['instruments'] });
          queryClient.invalidateQueries({ queryKey: ['instrument-pairs'] });
          queryClient.invalidateQueries({ queryKey: ['user-instrument-pairs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(priceChannel);
      supabase.removeChannel(signalsChannel);
      supabase.removeChannel(tradesChannel);
      supabase.removeChannel(indicatorsChannel);
      supabase.removeChannel(instrumentsChannel);
    };
  }, [queryClient]);

  const triggerPriceFetch = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-brent-price');
      if (error) throw error;
      console.log('Price fetch result:', data);
      return data;
    } catch (error) {
      console.error('Error triggering price fetch:', error);
      throw error;
    }
  }, []);

  return { triggerPriceFetch };
}
