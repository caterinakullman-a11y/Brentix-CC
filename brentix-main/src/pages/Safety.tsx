import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  Zap, 
  Clock, 
  Plus, 
  Trash2,
} from "lucide-react";
import {
  useEmergencyStop,
  useToggleEmergencyStop,
  useAutoTriggers,
  useCreateAutoTrigger,
  useToggleAutoTrigger,
  useDeleteAutoTrigger,
  AutoTrigger,
} from "@/hooks/useSafetyControls";
import { ConditionalOrderForm } from "@/components/safety/ConditionalOrderForm";
import { ConditionalOrdersList } from "@/components/safety/ConditionalOrdersList";
import { NotificationSettings } from "@/components/safety/NotificationSettings";
import { usePriceData } from "@/hooks/usePriceData";
import { toast } from "sonner";

export default function Safety() {
  const { data: emergencyStop, isLoading: loadingStop } = useEmergencyStop();
  const { data: triggers, isLoading: loadingTriggers } = useAutoTriggers();
  const { currentPrice } = usePriceData();

  const toggleEmergencyStop = useToggleEmergencyStop();
  const createTrigger = useCreateAutoTrigger();
  const toggleTrigger = useToggleAutoTrigger();
  const deleteTrigger = useDeleteAutoTrigger();

  const [showNewTrigger, setShowNewTrigger] = useState(false);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newTrigger, setNewTrigger] = useState({
    name: "",
    trigger_type: "MAX_DAILY_LOSS" as AutoTrigger["trigger_type"],
    threshold_value: 5,
    threshold_type: "PERCENT" as AutoTrigger["threshold_type"],
    action: "STOP_TRADING" as AutoTrigger["action"],
    is_active: true,
  });

  const handleEmergencyStop = async () => {
    const activating = !emergencyStop?.is_active;
    try {
      await toggleEmergencyStop.mutateAsync({ 
        activate: activating, 
        reason: activating ? "Manual activation" : undefined 
      });
      toast.success(activating ? "Nödstopp aktiverat!" : "Nödstopp avaktiverat");
    } catch {
      toast.error("Kunde inte ändra nödstopp");
    }
  };

  const handleCreateTrigger = async () => {
    try {
      await createTrigger.mutateAsync(newTrigger);
      toast.success("Trigger skapad");
      setShowNewTrigger(false);
      setNewTrigger({
        name: "",
        trigger_type: "MAX_DAILY_LOSS",
        threshold_value: 5,
        threshold_type: "PERCENT",
        action: "STOP_TRADING",
        is_active: true,
      });
    } catch {
      toast.error("Kunde inte skapa trigger");
    }
  };

  const triggerTypeLabels: Record<AutoTrigger["trigger_type"], string> = {
    MAX_DAILY_LOSS: "Max daglig förlust",
    MAX_POSITION_LOSS: "Max positionsförlust",
    MAX_DRAWDOWN: "Max drawdown",
    PROFIT_TARGET: "Vinstmål",
  };

  const actionLabels: Record<AutoTrigger["action"], string> = {
    CLOSE_POSITION: "Stäng position",
    CLOSE_ALL: "Stäng alla",
    STOP_TRADING: "Stoppa handel",
    NOTIFY: "Notifiera",
  };

  const isLoading = loadingStop || loadingTriggers;

  return (
    <MainLayout>
      <Helmet>
        <title>Säkerhet & Order - BRENTIX</title>
        <meta name="description" content="Hantera säkerhetsinställningar och villkorliga ordrar" />
      </Helmet>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Säkerhet & Order</h1>
          <p className="text-muted-foreground text-sm">
            Nödstopp, automatiska triggers och villkorliga ordrar
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        ) : (
          <>
            {/* Emergency Stop */}
            <Card className={`border-2 ${emergencyStop?.is_active ? "border-[#9A5B5B] bg-[#9A5B5B]/5" : "border-border"}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className={`h-5 w-5 ${emergencyStop?.is_active ? "text-[#9A5B5B]" : "text-muted-foreground"}`} />
                  Nödstopp
                </CardTitle>
                <CardDescription>
                  Stoppar all handel omedelbart och stänger positioner
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={emergencyStop?.is_active ? "destructive" : "outline"}>
                        {emergencyStop?.is_active ? "AKTIVERAT" : "Inaktivt"}
                      </Badge>
                      {emergencyStop?.triggered_at && (
                        <span className="text-xs text-muted-foreground">
                          Senast: {new Date(emergencyStop.triggered_at).toLocaleString("sv-SE")}
                        </span>
                      )}
                    </div>
                    {emergencyStop?.reason && (
                      <p className="text-sm text-muted-foreground">{emergencyStop.reason}</p>
                    )}
                  </div>
                  <Button
                    variant={emergencyStop?.is_active ? "outline" : "destructive"}
                    size="lg"
                    onClick={handleEmergencyStop}
                    disabled={toggleEmergencyStop.isPending}
                  >
                    {emergencyStop?.is_active ? "Avaktivera" : "AKTIVERA NÖDSTOPP"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Conditional Orders - Moved up for prominence */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Villkorliga Ordrar
                  </CardTitle>
                  <CardDescription>
                    Ordrar som exekveras automatiskt när prisvillkor uppfylls
                  </CardDescription>
                </div>
                <Button onClick={() => setShowNewOrder(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Ny Order
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {showNewOrder && (
                  <ConditionalOrderForm 
                    onClose={() => setShowNewOrder(false)} 
                    currentPrice={currentPrice}
                  />
                )}
                <ConditionalOrdersList />
              </CardContent>
            </Card>

            {/* Auto Triggers */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Automatiska Triggers
                  </CardTitle>
                  <CardDescription>
                    Sätt upp regler som triggar automatiskt vid specifika förhållanden
                  </CardDescription>
                </div>
                <Button onClick={() => setShowNewTrigger(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Ny Trigger
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {showNewTrigger && (
                  <div className="p-4 border border-border rounded-lg space-y-4 bg-muted/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Namn</Label>
                        <Input
                          value={newTrigger.name}
                          onChange={(e) => setNewTrigger({ ...newTrigger, name: e.target.value })}
                          placeholder="T.ex. Max daglig förlust"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Typ</Label>
                        <Select
                          value={newTrigger.trigger_type}
                          onValueChange={(v) => setNewTrigger({ ...newTrigger, trigger_type: v as AutoTrigger["trigger_type"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MAX_DAILY_LOSS">Max daglig förlust</SelectItem>
                            <SelectItem value="MAX_POSITION_LOSS">Max positionsförlust</SelectItem>
                            <SelectItem value="MAX_DRAWDOWN">Max drawdown</SelectItem>
                            <SelectItem value="PROFIT_TARGET">Vinstmål</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tröskel</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={newTrigger.threshold_value}
                            onChange={(e) => setNewTrigger({ ...newTrigger, threshold_value: parseFloat(e.target.value) })}
                          />
                          <Select
                            value={newTrigger.threshold_type}
                            onValueChange={(v) => setNewTrigger({ ...newTrigger, threshold_type: v as AutoTrigger["threshold_type"] })}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PERCENT">%</SelectItem>
                              <SelectItem value="ABSOLUTE">SEK</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Åtgärd</Label>
                        <Select
                          value={newTrigger.action}
                          onValueChange={(v) => setNewTrigger({ ...newTrigger, action: v as AutoTrigger["action"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CLOSE_POSITION">Stäng position</SelectItem>
                            <SelectItem value="CLOSE_ALL">Stäng alla positioner</SelectItem>
                            <SelectItem value="STOP_TRADING">Stoppa handel</SelectItem>
                            <SelectItem value="NOTIFY">Notifiera endast</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateTrigger} disabled={!newTrigger.name || createTrigger.isPending}>
                        Skapa
                      </Button>
                      <Button variant="outline" onClick={() => setShowNewTrigger(false)}>
                        Avbryt
                      </Button>
                    </div>
                  </div>
                )}

                {triggers && triggers.length > 0 ? (
                  <div className="space-y-2">
                    {triggers.map((trigger) => (
                      <div
                        key={trigger.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={trigger.is_active}
                            onCheckedChange={(checked) => toggleTrigger.mutate({ id: trigger.id, isActive: checked })}
                          />
                          <div>
                            <p className="font-medium text-sm">{trigger.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {triggerTypeLabels[trigger.trigger_type]}: {trigger.threshold_value}
                              {trigger.threshold_type === "PERCENT" ? "%" : " SEK"} → {actionLabels[trigger.action]}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {trigger.triggered_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Triggad {trigger.triggered_count}x
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTrigger.mutate(trigger.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Inga triggers konfigurerade
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <NotificationSettings />
          </>
        )}
      </div>
    </MainLayout>
  );
}
