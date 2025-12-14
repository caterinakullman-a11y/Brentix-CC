import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Activity, Target, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface PatternOccurrence {
  id: string;
  pattern_type: string;
  pattern_name: string;
  start_date: string;
  end_date: string;
  confidence: number;
  direction: string;
  entry_price: number | null;
  target_price: number | null;
  stop_loss: number | null;
  outcome: string | null;
}

interface PatternListProps {
  patterns: PatternOccurrence[];
  isLoading: boolean;
}

const categoryColors: Record<string, string> = {
  MOMENTUM_BREAKOUT: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  RSI_OVERSOLD_BOUNCE: "bg-green-500/20 text-green-400 border-green-500/30",
  MACD_GOLDEN_CROSS: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  VOLATILITY_SQUEEZE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MEAN_REVERSION: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  VOLUME_SPIKE: "bg-red-500/20 text-red-400 border-red-500/30",
  DOUBLE_BOTTOM: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  TREND_CONTINUATION: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
};

export function PatternList({ patterns, isLoading }: PatternListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Activity className="h-12 w-12 opacity-50 mb-4" />
        <p className="font-medium">No patterns detected yet</p>
        <p className="text-sm">Run pattern detection to find trading patterns</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {patterns.map((pattern) => (
        <Card key={pattern.id} className="border-0 bg-card/50 hover:bg-card/70 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    variant="outline" 
                    className={categoryColors[pattern.pattern_type] || "bg-muted"}
                  >
                    {pattern.pattern_name}
                  </Badge>
                  <Badge 
                    variant="outline"
                    className={pattern.direction === "BULLISH" 
                      ? "bg-chart-2/20 text-chart-2 border-chart-2/30" 
                      : "bg-chart-5/20 text-chart-5 border-chart-5/30"
                    }
                  >
                    {pattern.direction === "BULLISH" ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {pattern.direction}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-mono">
                    {format(parseISO(pattern.end_date), "MMM d, yyyy")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {(pattern.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
              </div>

              <div className="text-right">
                {pattern.entry_price && (
                  <div className="text-sm font-mono">
                    Entry: ${pattern.entry_price.toFixed(2)}
                  </div>
                )}
                {pattern.target_price && (
                  <div className="text-xs text-chart-2 font-mono">
                    Target: ${pattern.target_price.toFixed(2)}
                  </div>
                )}
                {pattern.stop_loss && (
                  <div className="text-xs text-chart-5 font-mono">
                    Stop: ${pattern.stop_loss.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
