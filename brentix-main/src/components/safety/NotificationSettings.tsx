import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, BellRing, Check, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useUserSettings } from "@/hooks/useUserSettings";
import { toast } from "sonner";

export function NotificationSettings() {
  const { isSupported, permission, isEnabled, requestPermission, sendNotification } = usePushNotifications();
  const { settings, isLoading, updateSettings } = useUserSettings();
  
  const [localSettings, setLocalSettings] = useState({
    notify_new_signals: true,
    notify_trade_executed: true,
    enable_push_notifications: true,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        notify_new_signals: settings.notify_new_signals ?? true,
        notify_trade_executed: settings.notify_trade_executed ?? true,
        enable_push_notifications: settings.enable_push_notifications ?? true,
      });
    }
  }, [settings]);

  const handleEnablePush = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success("Push-notifikationer aktiverade!");
      // Send test notification
      sendNotification("BRENTIX Notifikationer", {
        body: "Push-notifikationer är nu aktiverade för din enhet",
        tag: "test-notification",
      });
    } else {
      toast.error("Kunde inte aktivera push-notifikationer");
    }
  };

  const handleToggle = async (key: keyof typeof localSettings, value: boolean) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    
    try {
      await updateSettings({ [key]: value });
      toast.success("Inställning sparad");
    } catch {
      setLocalSettings(localSettings);
      toast.error("Kunde inte spara inställning");
    }
  };

  const handleTestNotification = () => {
    if (!isEnabled) {
      toast.error("Aktivera push-notifikationer först");
      return;
    }
    
    sendNotification("Testnotifikation", {
      body: "Detta är en testnotifikation från BRENTIX",
      tag: "test",
    });
    toast.success("Testnotifikation skickad");
  };

  if (isLoading) {
    return <div className="h-40 bg-muted/30 rounded-lg animate-pulse" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifikationsinställningar
        </CardTitle>
        <CardDescription>
          Välj vilka notifikationer du vill ta emot för ordrar och signaler
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push notification status */}
        <div className="p-4 rounded-lg bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isEnabled ? (
                <BellRing className="h-5 w-5 text-[#5B9A6F]" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-sm">Webbläsar Push-notifikationer</p>
                <p className="text-xs text-muted-foreground">
                  {!isSupported 
                    ? "Din webbläsare stöder inte push-notifikationer"
                    : isEnabled 
                      ? "Aktiverat - Du får notifikationer även när appen är i bakgrunden"
                      : "Inaktiverat - Aktivera för att få notifikationer"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isEnabled ? "default" : "outline"} className={isEnabled ? "bg-[#5B9A6F]" : ""}>
                {isEnabled ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                {isEnabled ? "Aktiv" : "Inaktiv"}
              </Badge>
            </div>
          </div>
          
          {isSupported && !isEnabled && (
            <Button onClick={handleEnablePush} size="sm" className="w-full">
              <Bell className="h-4 w-4 mr-2" />
              Aktivera Push-notifikationer
            </Button>
          )}
          
          {isEnabled && (
            <Button onClick={handleTestNotification} variant="outline" size="sm" className="w-full">
              Skicka testnotifikation
            </Button>
          )}
        </div>

        {/* Notification type toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify-signals">Nya signaler</Label>
              <p className="text-xs text-muted-foreground">
                Få notifikation när nya köp/sälj-signaler genereras
              </p>
            </div>
            <Switch
              id="notify-signals"
              checked={localSettings.notify_new_signals}
              onCheckedChange={(v) => handleToggle("notify_new_signals", v)}
              disabled={!isEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify-orders">Villkorliga ordrar</Label>
              <p className="text-xs text-muted-foreground">
                Få notifikation när villkorliga ordrar triggas eller exekveras
              </p>
            </div>
            <Switch
              id="notify-orders"
              checked={localSettings.notify_trade_executed}
              onCheckedChange={(v) => handleToggle("notify_trade_executed", v)}
              disabled={!isEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify-push">Push-notifikationer</Label>
              <p className="text-xs text-muted-foreground">
                Aktivera/inaktivera alla push-notifikationer
              </p>
            </div>
            <Switch
              id="notify-push"
              checked={localSettings.enable_push_notifications}
              onCheckedChange={(v) => handleToggle("enable_push_notifications", v)}
              disabled={!isEnabled}
            />
          </div>
        </div>

        {!isEnabled && (
          <p className="text-xs text-amber-500 text-center">
            Aktivera push-notifikationer ovan för att kunna ändra dessa inställningar
          </p>
        )}
      </CardContent>
    </Card>
  );
}
