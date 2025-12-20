import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface UserSettings {
  id: string;
  user_id: string;
  initial_capital_sek: number;
  current_capital_sek: number;
  stop_loss_percent: number;
  take_profit_percent: number;
  max_position_size_percent: number;
  enable_push_notifications: boolean;
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;
  auto_trading_enabled: boolean;
  avanza_account_id: string | null;
  avanza_instrument_id: string | null;
  position_size_sek: number | null;
  show_loading_skeletons: boolean;
  paper_trading_enabled: boolean;
  paper_balance: number;
  paper_starting_balance: number;
  notify_new_signals: boolean;
  notify_trade_executed: boolean;
  notify_daily_summary: boolean;
  notify_sound_enabled: boolean;
  onboarding_completed: boolean;
  preferred_bull_id: string | null;
  preferred_bear_id: string | null;
}

export interface UseUserSettingsResult {
  settings: UserSettings | null;
  isLoading: boolean;
  error: Error | null;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  isSaving: boolean;
  saveSuccess: boolean;
  refetch: () => Promise<void>;
}

const defaultSettings = {
  initial_capital_sek: 10000,
  current_capital_sek: 10000,
  stop_loss_percent: 2,
  take_profit_percent: 1,
  max_position_size_percent: 10,
  enable_push_notifications: true,
  enable_email_notifications: false,
  enable_sms_notifications: false,
  auto_trading_enabled: false,
  avanza_account_id: null,
  avanza_instrument_id: "2313155",
  position_size_sek: 1000,
  show_loading_skeletons: true,
  paper_trading_enabled: true,
  paper_balance: 100000,
  paper_starting_balance: 100000,
  notify_new_signals: true,
  notify_trade_executed: true,
  notify_daily_summary: false,
  notify_sound_enabled: true,
  onboarding_completed: false,
  preferred_bull_id: "2313155",
  preferred_bear_id: "2313156",
};

export function useUserSettings(): UseUserSettingsResult {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as UserSettings);
      } else {
        // Create default settings for new user
        const { data: newSettings, error: insertError } = await supabase
          .from("user_settings")
          .insert({
            user_id: user.id,
            ...defaultSettings,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings as UserSettings);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (updates: Partial<UserSettings>) => {
      if (!settings) return;

      setIsSaving(true);
      setSaveSuccess(false);

      try {
        const { error } = await supabase
          .from("user_settings")
          .update(updates)
          .eq("id", settings.id);

        if (error) throw error;

        setSettings((prev) => (prev ? { ...prev, ...updates } : null));
        setSaveSuccess(true);

        // Clear any existing timeout
        if (successTimeoutRef.current) {
          clearTimeout(successTimeoutRef.current);
        }
        // Reset success after 2 seconds
        successTimeoutRef.current = setTimeout(() => setSaveSuccess(false), 2000);
      } catch (err) {
        console.error("Error updating settings:", err);
        setError(err as Error);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [settings]
  );

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    isSaving,
    saveSuccess,
    refetch: fetchSettings,
  };
}
