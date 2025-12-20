import { useEffect, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Helper to handle subscription with error callback
function subscribeWithErrorHandling(
  channel: RealtimeChannel,
  onError?: (error: Error) => void
) {
  return channel.subscribe((status, error) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.error('Subscription error:', status, error);
      onError?.(new Error(`Subscription failed: ${status}`));
    }
  });
}

export function useRealtimeSubscriptions() {
  const queryClient = useQueryClient();
  const [connectionError, setConnectionError] = useState<Error | null>(null);

  useEffect(() => {
    const handleSubscriptionError = (error: Error) => {
      setConnectionError(error);
    };

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
        () => {
          queryClient.invalidateQueries({ queryKey: ['price-data'] });
        }
      );
    subscribeWithErrorHandling(priceChannel, handleSubscriptionError);

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
          queryClient.invalidateQueries({ queryKey: ['active-signal'] });
          queryClient.invalidateQueries({ queryKey: ['recent-signals'] });
          queryClient.invalidateQueries({ queryKey: ['active-signals-count'] });

          const signal = payload.new as { signal_type: string; is_active: boolean };
          if (signal.is_active) {
            toast({
              title: `Ny ${signal.signal_type}-signal`,
              description: "En ny handelssignal har genererats",
              duration: 5000,
            });
          }
        }
      );
    subscribeWithErrorHandling(signalsChannel, handleSubscriptionError);

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
        () => {
          queryClient.invalidateQueries({ queryKey: ['today-stats'] });
        }
      );
    subscribeWithErrorHandling(tradesChannel, handleSubscriptionError);

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
        () => {
          queryClient.invalidateQueries({ queryKey: ['technical-indicators'] });
        }
      );
    subscribeWithErrorHandling(indicatorsChannel, handleSubscriptionError);

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
        () => {
          queryClient.invalidateQueries({ queryKey: ['instruments'] });
          queryClient.invalidateQueries({ queryKey: ['instrument-pairs'] });
          queryClient.invalidateQueries({ queryKey: ['user-instrument-pairs'] });
        }
      );
    subscribeWithErrorHandling(instrumentsChannel, handleSubscriptionError);

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

  return { triggerPriceFetch, connectionError };
}
