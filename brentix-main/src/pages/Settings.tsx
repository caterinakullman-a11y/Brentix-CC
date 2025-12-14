import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/hooks/useUserSettings";
import { QueueStatusCard } from "@/components/settings/QueueStatusCard";
import { TradingModeCard } from "@/components/settings/TradingModeCard";
import { AvanzaSettingsCard } from "@/components/settings/AvanzaSettingsCard";
import { CapitalSettingsCard } from "@/components/settings/CapitalSettingsCard";
import { RiskManagementCard } from "@/components/settings/RiskManagementCard";
import { AppearanceSettingsCard } from "@/components/settings/AppearanceSettingsCard";
import { NotificationSettingsCard } from "@/components/settings/NotificationSettingsCard";
import { PreferredInstrumentsCard } from "@/components/settings/PreferredInstrumentsCard";
import { ToolSettingsCard } from "@/components/settings/ToolSettingsCard";
import { StorageManagementCard } from "@/components/settings/StorageManagementCard";
import { DataExportCard } from "@/components/settings/DataExportCard";

interface FormErrors {
  initial_capital_sek?: string;
  stop_loss_percent?: string;
  take_profit_percent?: string;
  max_position_size_percent?: string;
  position_size_sek?: string;
}

const Settings = () => {
  const { settings, isLoading, updateSettings, isSaving, saveSuccess } = useUserSettings();

  const [formData, setFormData] = useState({
    initial_capital_sek: 10000,
    stop_loss_percent: 2,
    take_profit_percent: 1,
    max_position_size_percent: 10,
    enable_push_notifications: true,
    avanza_account_id: "",
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
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        initial_capital_sek: Number(settings.initial_capital_sek),
        stop_loss_percent: Number(settings.stop_loss_percent),
        take_profit_percent: Number(settings.take_profit_percent),
        max_position_size_percent: Number(settings.max_position_size_percent),
        enable_push_notifications: settings.enable_push_notifications,
        avanza_account_id: settings.avanza_account_id ?? "",
        avanza_instrument_id: settings.avanza_instrument_id ?? "2313155",
        position_size_sek: Number(settings.position_size_sek) || 1000,
        show_loading_skeletons: settings.show_loading_skeletons ?? true,
        paper_trading_enabled: settings.paper_trading_enabled ?? true,
        paper_balance: Number(settings.paper_balance) || 100000,
        paper_starting_balance: Number(settings.paper_starting_balance) || 100000,
        notify_new_signals: settings.notify_new_signals ?? true,
        notify_trade_executed: settings.notify_trade_executed ?? true,
        notify_daily_summary: settings.notify_daily_summary ?? false,
        notify_sound_enabled: settings.notify_sound_enabled ?? true,
      });
    }
  }, [settings]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (formData.initial_capital_sek < 1000) newErrors.initial_capital_sek = "Capital must be at least 1,000 SEK";
    if (formData.stop_loss_percent < 0.1 || formData.stop_loss_percent > 100) newErrors.stop_loss_percent = "Must be between 0.1% and 100%";
    if (formData.take_profit_percent < 0.1 || formData.take_profit_percent > 100) newErrors.take_profit_percent = "Must be between 0.1% and 100%";
    if (formData.max_position_size_percent < 0.1 || formData.max_position_size_percent > 100) newErrors.max_position_size_percent = "Must be between 0.1% and 100%";
    if (formData.position_size_sek < 100) newErrors.position_size_sek = "Position size must be at least 100 SEK";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: number | boolean | string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      await updateSettings({
        initial_capital_sek: formData.initial_capital_sek,
        stop_loss_percent: formData.stop_loss_percent,
        take_profit_percent: formData.take_profit_percent,
        max_position_size_percent: formData.max_position_size_percent,
        enable_push_notifications: formData.enable_push_notifications,
        avanza_account_id: formData.avanza_account_id || null,
        avanza_instrument_id: formData.avanza_instrument_id,
        position_size_sek: formData.position_size_sek,
        show_loading_skeletons: formData.show_loading_skeletons,
        paper_trading_enabled: formData.paper_trading_enabled,
        paper_balance: formData.paper_balance,
        paper_starting_balance: formData.paper_starting_balance,
        notify_new_signals: formData.notify_new_signals,
        notify_trade_executed: formData.notify_trade_executed,
        notify_daily_summary: formData.notify_daily_summary,
        notify_sound_enabled: formData.notify_sound_enabled,
      });
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 max-w-3xl animate-pulse">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="glass-card rounded-2xl p-6 h-64 bg-muted/50" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Configure your trading preferences</p>
          </div>
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-sm font-medium text-primary animate-fade-in">
                <Check className="h-4 w-4" /> Saved
              </span>
            )}
            {isDirty && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </div>

        <TradingModeCard
          paperTradingEnabled={formData.paper_trading_enabled}
          paperBalance={formData.paper_balance}
          paperStartingBalance={formData.paper_starting_balance}
          onPaperTradingChange={(v) => handleChange("paper_trading_enabled", v)}
          onPaperBalanceChange={(v) => handleChange("paper_balance", v)}
          onResetBalance={() => handleChange("paper_balance", formData.paper_starting_balance)}
        />

        <PreferredInstrumentsCard />

        <AvanzaSettingsCard
          accountId={formData.avanza_account_id}
          instrumentId={formData.avanza_instrument_id}
          positionSizeSek={formData.position_size_sek}
          positionSizeError={errors.position_size_sek}
          onAccountIdChange={(v) => handleChange("avanza_account_id", v)}
          onInstrumentIdChange={(v) => handleChange("avanza_instrument_id", v)}
          onPositionSizeChange={(v) => handleChange("position_size_sek", v)}
        />

        <QueueStatusCard />

        <CapitalSettingsCard
          initialCapitalSek={formData.initial_capital_sek}
          currentCapitalSek={settings?.current_capital_sek ?? null}
          error={errors.initial_capital_sek}
          onInitialCapitalChange={(v) => handleChange("initial_capital_sek", v)}
        />

        <RiskManagementCard
          stopLossPercent={formData.stop_loss_percent}
          takeProfitPercent={formData.take_profit_percent}
          maxPositionSizePercent={formData.max_position_size_percent}
          errors={{
            stopLossPercent: errors.stop_loss_percent,
            takeProfitPercent: errors.take_profit_percent,
            maxPositionSizePercent: errors.max_position_size_percent,
          }}
          onStopLossChange={(v) => handleChange("stop_loss_percent", v)}
          onTakeProfitChange={(v) => handleChange("take_profit_percent", v)}
          onMaxPositionChange={(v) => handleChange("max_position_size_percent", v)}
        />

        <AppearanceSettingsCard
          showLoadingSkeletons={formData.show_loading_skeletons}
          onShowLoadingSkeletonsChange={(v) => handleChange("show_loading_skeletons", v)}
        />

        <NotificationSettingsCard
          notifyNewSignals={formData.notify_new_signals}
          notifyTradeExecuted={formData.notify_trade_executed}
          notifyDailySummary={formData.notify_daily_summary}
          notifySoundEnabled={formData.notify_sound_enabled}
          onNotifyNewSignalsChange={(v) => handleChange("notify_new_signals", v)}
          onNotifyTradeExecutedChange={(v) => handleChange("notify_trade_executed", v)}
          onNotifyDailySummaryChange={(v) => handleChange("notify_daily_summary", v)}
          onNotifySoundEnabledChange={(v) => handleChange("notify_sound_enabled", v)}
        />

        <ToolSettingsCard />

        {/* Data Storage & Export Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <StorageManagementCard />
          <DataExportCard />
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
