import { useAdvancedAnalysis, type CombinedRecommendation } from "@/hooks/useAdvancedAnalysis";
import type { ToolResult } from "@/hooks/analysis";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TOOL_ICONS: Record<string, string> = {
  "Frekvensanalysator": "📊",
  "Momentum Pulse": "⚡",
  "Volatility Window": "📈",
  "Micro-Pattern": "🔍",
  "Smart Exit": "🎯",
  "Reversal Meter": "🔄",
  "Trade Timing": "⏱️",
  "Correlation Radar": "📡",
  "Risk/Minut": "⚠️",
};

export function AdvancedToolsPanel() {
  const {
    frequencyResult,
    momentumResult,
    volatilityResult,
    microPatternResult,
    smartExitResult,
    reversalResult,
    timingResult,
    correlationResult,
    riskPerMinuteResult,
    combinedRecommendation,
    isLoading,
  } = useAdvancedAnalysis();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const tools = [
    frequencyResult,
    momentumResult,
    volatilityResult,
    microPatternResult,
    smartExitResult,
    reversalResult,
    timingResult,
    correlationResult,
    riskPerMinuteResult,
  ].filter((r): r is ToolResult => r !== null);

  return (
    <div className="space-y-4">
      {/* Combined Recommendation */}
      <CombinedRecommendationCard recommendation={combinedRecommendation} />

      {/* Individual Tools Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {tools.map((result) => (
          <ToolCard
            key={result.name}
            icon={TOOL_ICONS[result.name] || "📊"}
            result={result}
          />
        ))}
      </div>
    </div>
  );
}

function CombinedRecommendationCard({ 
  recommendation 
}: { 
  recommendation: CombinedRecommendation 
}) {
  if (!recommendation || recommendation.factors.length === 0) {
    return (
      <Card className="p-4 text-center text-muted-foreground">
        <p>Laddar analysdata...</p>
      </Card>
    );
  }

  const isBuy = recommendation.action.includes("BUY");
  const isBull = recommendation.action.includes("BULL");
  const isHold = recommendation.action === "HOLD";

  const actionText = isHold 
    ? "AVVAKTA" 
    : `${isBuy ? "KÖP" : "SÄLJ"} ${isBull ? "BULL" : "BEAR"}`;

  return (
    <Card
      className={cn(
        "p-4 md:p-6",
        isHold && "bg-muted/30 border-muted",
        !isHold && isBuy && "bg-primary/5 border-primary/30",
        !isHold && !isBuy && "bg-destructive/5 border-destructive/30"
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Main Action */}
        <div className="flex-1 text-center md:text-left">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            Kombinerad Rekommendation
          </p>
          <div
            className={cn(
              "text-2xl md:text-3xl font-bold",
              isHold && "text-muted-foreground",
              !isHold && isBuy && "text-primary",
              !isHold && !isBuy && "text-destructive"
            )}
          >
            {actionText}
          </div>
          <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
            <span className="text-sm text-muted-foreground">Confidence:</span>
            <span className="font-mono font-semibold">
              {recommendation.confidence.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Strategy */}
        {!isHold && (
          <div className="flex-1 bg-muted/30 rounded-lg p-3 text-sm">
            <p className="font-semibold mb-2">Strategi:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Entry:</span>{" "}
                <span className="font-mono">${recommendation.strategy.entry.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Target:</span>{" "}
                <span className="font-mono text-primary">
                  {isBull ? "+" : "-"}
                  {Math.abs((recommendation.strategy.target / recommendation.strategy.entry - 1) * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Stop:</span>{" "}
                <span className="font-mono text-destructive">
                  {isBull ? "-" : "+"}
                  {Math.abs((recommendation.strategy.stopLoss / recommendation.strategy.entry - 1) * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Håll:</span>{" "}
                <span className="font-mono">{recommendation.strategy.suggestedHoldTime}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Factors Summary */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-2">Faktorer ({recommendation.factors.length} aktiva):</p>
        <div className="flex flex-wrap gap-1">
          {recommendation.factors.map((factor) => (
            <Badge
              key={factor.name}
              variant={factor.score > 0 ? "default" : factor.score < 0 ? "destructive" : "outline"}
              className="text-[10px] px-1.5 py-0"
            >
              {TOOL_ICONS[factor.name]} {factor.score > 0 ? "+" : ""}{factor.score}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ToolCard({ 
  icon, 
  result 
}: { 
  icon: string; 
  result: ToolResult;
}) {
  const isPositive = result.score > 0;
  const isNegative = result.score < 0;

  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="font-medium text-xs truncate">{result.name}</span>
      </div>

      <div
        className={cn(
          "text-xl font-bold mb-1",
          isPositive && "text-primary",
          isNegative && "text-destructive",
          !isPositive && !isNegative && "text-muted-foreground"
        )}
      >
        {isPositive && "+"}
        {result.score}%
      </div>

      <Progress value={result.confidence} className="h-1.5 mb-2" />

      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
        {result.reasoning}
      </p>

      <Badge
        variant={
          result.signal === "BUY"
            ? "default"
            : result.signal === "SELL"
            ? "destructive"
            : "outline"
        }
        className="mt-2 text-[10px] px-1.5 py-0"
      >
        {result.signal === "BUY" ? "KÖP" : result.signal === "SELL" ? "SÄLJ" : "AVVAKTA"}
      </Badge>
    </Card>
  );
}
