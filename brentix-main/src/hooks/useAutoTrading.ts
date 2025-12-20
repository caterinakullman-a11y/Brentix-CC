import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAutoTrading() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Use ref to avoid stale closure in toggle callback
  const isEnabledRef = useRef(isEnabled);
  isEnabledRef.current = isEnabled;

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchStatus = async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("auto_trading_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setIsEnabled(data.auto_trading_enabled ?? false);
      }
      setIsLoading(false);
    };

    fetchStatus();
  }, [user]);

  const toggle = useCallback(async () => {
    if (!user) return;

    const newState = !isEnabledRef.current;
    setIsEnabled(newState);

    await supabase
      .from("user_settings")
      .update({ auto_trading_enabled: newState })
      .eq("user_id", user.id);
  }, [user]);

  return { isEnabled, isLoading, toggle };
}
