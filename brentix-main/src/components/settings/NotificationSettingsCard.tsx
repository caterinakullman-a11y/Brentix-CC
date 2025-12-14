import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface NotificationSettingsCardProps {
  notifyNewSignals: boolean;
  notifyTradeExecuted: boolean;
  notifyDailySummary: boolean;
  notifySoundEnabled: boolean;
  onNotifyNewSignalsChange: (value: boolean) => void;
  onNotifyTradeExecutedChange: (value: boolean) => void;
  onNotifyDailySummaryChange: (value: boolean) => void;
  onNotifySoundEnabledChange: (value: boolean) => void;
}

export function NotificationSettingsCard({
  notifyNewSignals,
  notifyTradeExecuted,
  notifyDailySummary,
  notifySoundEnabled,
  onNotifyNewSignalsChange,
  onNotifyTradeExecutedChange,
  onNotifyDailySummaryChange,
  onNotifySoundEnabledChange,
}: NotificationSettingsCardProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Notifications</h2>
          <p className="text-sm text-muted-foreground">Configure alert preferences</p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium text-foreground">New Signals</p>
            <p className="text-sm text-muted-foreground">
              Get notified when new trading signals are generated
            </p>
          </div>
          <Switch
            checked={notifyNewSignals}
            onCheckedChange={onNotifyNewSignalsChange}
          />
        </div>
        <div className="flex items-center justify-between py-2 border-t border-border">
          <div>
            <p className="font-medium text-foreground">Trade Executed</p>
            <p className="text-sm text-muted-foreground">
              Get notified when trades are executed
            </p>
          </div>
          <Switch
            checked={notifyTradeExecuted}
            onCheckedChange={onNotifyTradeExecutedChange}
          />
        </div>
        <div className="flex items-center justify-between py-2 border-t border-border">
          <div>
            <p className="font-medium text-foreground">Daily Summary</p>
            <p className="text-sm text-muted-foreground">
              Receive a daily summary of trading activity
            </p>
          </div>
          <Switch
            checked={notifyDailySummary}
            onCheckedChange={onNotifyDailySummaryChange}
          />
        </div>
        <div className="flex items-center justify-between py-2 border-t border-border">
          <div>
            <p className="font-medium text-foreground">Notification Sound</p>
            <p className="text-sm text-muted-foreground">
              Play a sound when new notifications arrive
            </p>
          </div>
          <Switch
            checked={notifySoundEnabled}
            onCheckedChange={onNotifySoundEnabledChange}
          />
        </div>
      </div>
    </div>
  );
}
