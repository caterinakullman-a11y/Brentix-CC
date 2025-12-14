import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAdvancedAnalysis } from "@/hooks/useAdvancedAnalysis";
import { Skeleton } from "@/components/ui/skeleton";

const TOOLS = [
  { 
    key: "frequency_analyzer_enabled", 
    name: "Frekvensanalysator", 
    icon: "📊", 
    desc: "Hitta optimalt uppdateringsintervall" 
  },
  { 
    key: "momentum_pulse_enabled", 
    name: "Momentum Pulse", 
    icon: "⚡", 
    desc: "Fånga snabba prisrörelser" 
  },
  { 
    key: "volatility_window_enabled", 
    name: "Volatility Window", 
    icon: "📈", 
    desc: "Identifiera bästa handelstider" 
  },
  { 
    key: "micro_pattern_enabled", 
    name: "Micro-Pattern Scanner", 
    icon: "🔍", 
    desc: "Hitta kortsiktiga mönster" 
  },
  { 
    key: "smart_exit_enabled", 
    name: "Smart Exit", 
    icon: "🎯", 
    desc: "Optimera exit-timing" 
  },
  { 
    key: "reversal_meter_enabled", 
    name: "Reversal Meter", 
    icon: "🔄", 
    desc: "Varna för vändningar" 
  },
  { 
    key: "timing_score_enabled", 
    name: "Trade Timing", 
    icon: "⏱️", 
    desc: "Timing-score 0-100" 
  },
  { 
    key: "correlation_radar_enabled", 
    name: "Correlation Radar", 
    icon: "📡", 
    desc: "Korrelerade marknader" 
  },
  { 
    key: "risk_per_minute_enabled", 
    name: "Risk/Minut", 
    icon: "⚠️", 
    desc: "Tidsrisk-beräkning" 
  },
] as const;

export function ToolSettingsCard() {
  const { toolSettings, updateSettings, isLoading, isUpdating } = useAdvancedAnalysis();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🛠️ Analysverktyg
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🛠️ Analysverktyg
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {TOOLS.map((tool) => (
          <div
            key={tool.key}
            className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{tool.icon}</span>
              <div>
                <Label className="font-medium text-sm">{tool.name}</Label>
                <p className="text-xs text-muted-foreground">{tool.desc}</p>
              </div>
            </div>
            <Switch
              checked={toolSettings?.[tool.key] ?? true}
              onCheckedChange={(checked) =>
                updateSettings({ [tool.key]: checked })
              }
              disabled={isUpdating}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
