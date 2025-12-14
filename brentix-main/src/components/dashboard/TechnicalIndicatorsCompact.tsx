import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TechnicalIndicatorsCompactProps {
  rsi: number;
  macd: number;
  macdSignal: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  currentPrice: number;
  isLoading?: boolean;
  hasData?: boolean;
}

export function TechnicalIndicatorsCompact({
  rsi,
  macd,
  macdSignal,
  bollingerUpper,
  bollingerMiddle,
  bollingerLower,
  currentPrice,
  isLoading = false,
  hasData = false,
}: TechnicalIndicatorsCompactProps) {
  // RSI status
  const getRsiStatus = (value: number) => {
    if (!hasData || value === 0) return { label: "—", variant: "secondary" as const };
    if (value < 30) return { label: "Översåld", variant: "default" as const, color: "text-primary" };
    if (value > 70) return { label: "Överköpt", variant: "destructive" as const, color: "text-destructive" };
    return { label: "Neutral", variant: "secondary" as const };
  };

  // MACD trend
  const getMacdTrend = () => {
    if (!hasData) return { icon: Minus, label: "—", color: "" };
    const macdHistogram = macd - macdSignal;
    if (macdHistogram > 0) return { icon: TrendingUp, label: "Bullish", color: "text-primary" };
    if (macdHistogram < 0) return { icon: TrendingDown, label: "Bearish", color: "text-destructive" };
    return { icon: Minus, label: "Neutral", color: "text-muted-foreground" };
  };

  // Bollinger position
  const getBollingerPosition = () => {
    if (!hasData || currentPrice === 0) return "—";
    if (currentPrice >= bollingerUpper) return "Över övre";
    if (currentPrice <= bollingerLower) return "Under nedre";
    if (currentPrice > bollingerMiddle) return "Övre halva";
    return "Nedre halva";
  };

  // Overall trend
  const getOverallTrend = () => {
    if (!hasData) return { icon: Minus, label: "—", color: "" };
    let bullishSignals = 0;
    let bearishSignals = 0;
    
    if (rsi < 30) bullishSignals++;
    if (rsi > 70) bearishSignals++;
    if (macd > macdSignal) bullishSignals++;
    if (macd < macdSignal) bearishSignals++;
    if (currentPrice > bollingerMiddle) bullishSignals++;
    if (currentPrice < bollingerMiddle) bearishSignals++;
    
    if (bullishSignals > bearishSignals) return { icon: TrendingUp, label: "Uppåt", color: "text-primary" };
    if (bearishSignals > bullishSignals) return { icon: TrendingDown, label: "Nedåt", color: "text-destructive" };
    return { icon: Minus, label: "Sidledes", color: "text-muted-foreground" };
  };

  const rsiStatus = getRsiStatus(rsi);
  const macdTrend = getMacdTrend();
  const overallTrend = getOverallTrend();
  const TrendIcon = overallTrend.icon;
  const MacdIcon = macdTrend.icon;

  return (
    <div className={cn(
      "glass-card rounded-xl p-4",
      isLoading && "animate-pulse opacity-70"
    )}>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Tekniska Indikatorer
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {/* RSI */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">RSI(14)</span>
          <div className="flex items-center gap-2">
            <span className={cn("font-mono font-medium", rsiStatus.color)}>
              {hasData && rsi > 0 ? rsi.toFixed(1) : "—"}
            </span>
            <Badge variant={rsiStatus.variant} className="text-[10px] px-1.5 py-0">
              {rsiStatus.label}
            </Badge>
          </div>
        </div>

        {/* MACD */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">MACD</span>
          <div className="flex items-center gap-2">
            <span className={cn("font-mono font-medium", macdTrend.color)}>
              {hasData ? (macd >= 0 ? "+" : "") + macd.toFixed(2) : "—"}
            </span>
            <MacdIcon className={cn("h-3 w-3", macdTrend.color)} />
          </div>
        </div>

        {/* Overall Trend */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Trend</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px] gap-1", overallTrend.color)}>
              <TrendIcon className="h-3 w-3" />
              {overallTrend.label}
            </Badge>
          </div>
        </div>

        {/* Bollinger */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Bollinger</span>
          <span className="text-sm text-muted-foreground">
            {getBollingerPosition()}
          </span>
        </div>
      </div>
    </div>
  );
}
