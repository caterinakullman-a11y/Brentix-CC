import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InstrumentPair } from "@/hooks/useInstruments";
import { TrendingUp, TrendingDown, BarChart3, Activity, Shield } from "lucide-react";

interface CorrelationAnalysisProps {
  pair: InstrumentPair;
}

export function CorrelationAnalysis({ pair }: CorrelationAnalysisProps) {
  const correlationScore = pair.correlation_score || 0;
  const hedgeEfficiency = pair.hedge_efficiency || 0;
  const volumeRatio = pair.volume_ratio || 0;

  const getCorrelationColor = (score: number) => {
    if (score >= 90) return "text-[#5B9A6F]";
    if (score >= 70) return "text-amber-500";
    return "text-[#9A5B5B]";
  };

  const getCorrelationLabel = (score: number) => {
    if (score >= 95) return "Utmärkt";
    if (score >= 85) return "Mycket bra";
    if (score >= 70) return "Bra";
    if (score >= 50) return "Måttlig";
    return "Svag";
  };

  const bullLeverage = pair.bull_instrument?.leverage || 0;
  const bearLeverage = pair.bear_instrument?.leverage || 0;
  const leverageDiff = Math.abs(bullLeverage - bearLeverage);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Korrelationsanalys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pair Info */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#5B9A6F]" />
            <span className="text-sm font-medium">{pair.bull_instrument?.name}</span>
          </div>
          <span className="text-muted-foreground text-sm">↔</span>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-[#9A5B5B]" />
            <span className="text-sm font-medium">{pair.bear_instrument?.name}</span>
          </div>
        </div>

        {/* Correlation Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Korrelation</span>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${getCorrelationColor(correlationScore)}`}>
                {correlationScore.toFixed(1)}%
              </span>
              <Badge 
                variant="outline" 
                className={`text-xs ${getCorrelationColor(correlationScore)} border-current`}
              >
                {getCorrelationLabel(correlationScore)}
              </Badge>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                correlationScore >= 90 ? "bg-[#5B9A6F]" : 
                correlationScore >= 70 ? "bg-amber-500" : "bg-[#9A5B5B]"
              }`}
              style={{ width: `${correlationScore}%` }}
            />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Hedge Effektivitet</span>
            </div>
            <span className={`text-lg font-semibold ${getCorrelationColor(hedgeEfficiency)}`}>
              {hedgeEfficiency.toFixed(1)}%
            </span>
          </div>

          <div className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Volymkvot</span>
            </div>
            <span className="text-lg font-semibold text-foreground">
              {volumeRatio.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Leverage Comparison */}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Hävstångsjämförelse</span>
          <div className="flex items-center gap-3">
            <div className="flex-1 p-2 rounded bg-[#5B9A6F]/10 text-center">
              <span className="text-xs text-muted-foreground block">BULL</span>
              <span className="text-sm font-semibold text-[#5B9A6F]">{bullLeverage}x</span>
            </div>
            <div className="flex-1 p-2 rounded bg-[#9A5B5B]/10 text-center">
              <span className="text-xs text-muted-foreground block">BEAR</span>
              <span className="text-sm font-semibold text-[#9A5B5B]">{bearLeverage}x</span>
            </div>
            <div className="flex-1 p-2 rounded bg-muted/50 text-center">
              <span className="text-xs text-muted-foreground block">Diff</span>
              <span className={`text-sm font-semibold ${leverageDiff === 0 ? "text-[#5B9A6F]" : "text-amber-500"}`}>
                {leverageDiff}x
              </span>
            </div>
          </div>
        </div>

        {/* Match Indicators */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
          <Badge 
            variant={pair.leverage_match ? "default" : "outline"}
            className={pair.leverage_match ? "bg-[#5B9A6F] hover:bg-[#5B9A6F]/90" : ""}
          >
            {pair.leverage_match ? "✓" : "✗"} Hävstång
          </Badge>
          <Badge 
            variant={pair.issuer_match ? "default" : "outline"}
            className={pair.issuer_match ? "bg-[#5B9A6F] hover:bg-[#5B9A6F]/90" : ""}
          >
            {pair.issuer_match ? "✓" : "✗"} Utgivare
          </Badge>
          <Badge 
            variant={pair.recommended ? "default" : "outline"}
            className={pair.recommended ? "bg-amber-500 hover:bg-amber-500/90" : ""}
          >
            {pair.recommended ? "★ Rekommenderad" : "Standard"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
