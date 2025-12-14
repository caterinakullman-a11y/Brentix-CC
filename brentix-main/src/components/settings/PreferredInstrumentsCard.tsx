import { useState, useEffect } from "react";
import { Save, RefreshCw, Link2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useUserSettings } from "@/hooks/useUserSettings";
import { InstrumentSelector } from "./InstrumentSelector";
import { cn } from "@/lib/utils";
import { 
  OIL_INSTRUMENTS, 
  DEFAULT_BULL_ID, 
  DEFAULT_BEAR_ID,
  findMatchingPair 
} from "@/constants/instruments";

export function PreferredInstrumentsCard() {
  const { settings, updateSettings, isSaving } = useUserSettings();
  
  const [bullId, setBullId] = useState(DEFAULT_BULL_ID);
  const [bearId, setBearId] = useState(DEFAULT_BEAR_ID);
  const [autoMatch, setAutoMatch] = useState(true);

  // Initialize from settings
  useEffect(() => {
    if (settings) {
      setBullId(settings.preferred_bull_id || DEFAULT_BULL_ID);
      setBearId(settings.preferred_bear_id || DEFAULT_BEAR_ID);
    }
  }, [settings]);

  // Get instrument details
  const bullInstrument = OIL_INSTRUMENTS.find(i => i.id === bullId);
  const bearInstrument = OIL_INSTRUMENTS.find(i => i.id === bearId);

  // Check if pair matches (same leverage & issuer)
  const isMatchingPair = bullInstrument && bearInstrument &&
    bullInstrument.leverage === bearInstrument.leverage &&
    bullInstrument.issuer === bearInstrument.issuer;

  // Auto-match when BULL changes
  useEffect(() => {
    if (autoMatch && bullId) {
      const matchingBear = findMatchingPair(bullId);
      if (matchingBear) {
        setBearId(matchingBear.id);
      }
    }
  }, [bullId, autoMatch]);

  const handleSave = async () => {
    await updateSettings({
      preferred_bull_id: bullId,
      preferred_bear_id: bearId,
    });
    
    toast({
      title: "Certifikat sparade",
      description: `BULL: ${bullInstrument?.name}, BEAR: ${bearInstrument?.name}`,
    });
  };

  const handleReset = () => {
    setBullId(DEFAULT_BULL_ID);
    setBearId(DEFAULT_BEAR_ID);
    setAutoMatch(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          Preferred Certifikat
        </CardTitle>
        <CardDescription>
          Välj vilka BULL och BEAR certifikat du vill använda för handel
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Auto-match toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="auto-match">Automatisk matchning</Label>
              <p className="text-xs text-muted-foreground">
                Välj BEAR med samma hävstång och utgivare
              </p>
            </div>
          </div>
          <Switch
            id="auto-match"
            checked={autoMatch}
            onCheckedChange={setAutoMatch}
          />
        </div>

        {/* Instrument selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InstrumentSelector
            type="BULL"
            selectedId={bullId}
            onSelect={setBullId}
          />
          
          <InstrumentSelector
            type="BEAR"
            selectedId={bearId}
            onSelect={setBearId}
          />
        </div>

        {/* Pair status */}
        {bullInstrument && bearInstrument && (
          <div className={cn(
            "p-4 rounded-lg flex items-start gap-3",
            isMatchingPair ? "bg-primary/10" : "bg-yellow-500/10"
          )}>
            {isMatchingPair ? (
              <>
                <Link2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-primary">Matchande par</p>
                  <p className="text-sm text-muted-foreground">
                    Båda har x{bullInstrument.leverage} hävstång från {bullInstrument.issuer}
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-600">Olika specifikationer</p>
                  <p className="text-sm text-muted-foreground">
                    BULL: x{bullInstrument.leverage} ({bullInstrument.issuer}) vs 
                    BEAR: x{bearInstrument.leverage} ({bearInstrument.issuer})
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Detta kan påverka hedging-effektiviteten
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Summary table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left">Egenskap</th>
                <th className="px-4 py-2 text-center">🐂 BULL</th>
                <th className="px-4 py-2 text-center">🐻 BEAR</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-2 text-muted-foreground">Hävstång</td>
                <td className="px-4 py-2 text-center font-mono">x{bullInstrument?.leverage || "-"}</td>
                <td className="px-4 py-2 text-center font-mono">x{bearInstrument?.leverage || "-"}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2 text-muted-foreground">Utgivare</td>
                <td className="px-4 py-2 text-center">{bullInstrument?.issuer || "-"}</td>
                <td className="px-4 py-2 text-center">{bearInstrument?.issuer || "-"}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2 text-muted-foreground">Spread</td>
                <td className="px-4 py-2 text-center">{bullInstrument?.spreadPercent || "-"}%</td>
                <td className="px-4 py-2 text-center">{bearInstrument?.spreadPercent || "-"}%</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2 text-muted-foreground">Volym (snitt)</td>
                <td className="px-4 py-2 text-center">
                  {bullInstrument?.avgVolume ? `${(bullInstrument.avgVolume / 1000).toFixed(0)}k` : "-"}
                </td>
                <td className="px-4 py-2 text-center">
                  {bearInstrument?.avgVolume ? `${(bearInstrument.avgVolume / 1000).toFixed(0)}k` : "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Återställ
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Sparar..." : "Spara certifikat"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
