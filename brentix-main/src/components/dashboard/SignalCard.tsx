import { TrendingUp, TrendingDown, Minus, Target, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutoTrading } from "@/hooks/useAutoTrading";

type SignalType = "BUY" | "SELL" | "HOLD";
type SignalStrength = "STRONG" | "MODERATE" | "WEAK";

interface SignalCardProps {
  type: SignalType;
  strength: SignalStrength;
  probabilityUp: number;
  probabilityDown: number;
  confidence: number;
  currentPrice: number;
  signalPrice?: number;
  targetPrice: number;
  stopLoss: number;
  reasoning: string;
  isLoading?: boolean;
  hasData?: boolean;
  autoExecuted?: boolean;
  executedAt?: string | null;
  isExecuting?: boolean;
  rsi?: number;
}

const signalConfig = {
  BUY: {
    label: "KÖP",
    labelEn: "BUY",
    icon: TrendingUp,
    bgClass: "bg-primary/10",
    textClass: "text-primary",
    glowClass: "glow-bullish",
    borderClass: "border-primary/30",
  },
  SELL: {
    label: "SÄLJ",
    labelEn: "SELL",
    icon: TrendingDown,
    bgClass: "bg-destructive/10",
    textClass: "text-destructive",
    glowClass: "glow-bearish",
    borderClass: "border-destructive/30",
  },
  HOLD: {
    label: "AVVAKTA",
    labelEn: "HOLD",
    icon: Minus,
    bgClass: "bg-warning/10",
    textClass: "text-warning",
    glowClass: "glow-neutral",
    borderClass: "border-warning/30",
  },
};

const strengthLabels = {
  STRONG: "STARK",
  MODERATE: "MODERAT",
  WEAK: "SVAG",
};

// Format RSI reasoning
function formatReasoning(reasoning: string, rsi?: number): string {
  if (rsi && rsi > 0 && rsi < 100) {
    if (rsi < 30) return `RSI är översåld på ${rsi.toFixed(1)} - köpläge`;
    if (rsi > 70) return `RSI är överköpt på ${rsi.toFixed(1)} - säljläge`;
    return `RSI neutral på ${rsi.toFixed(1)}`;
  }
  // Avoid showing "RSI oversold at 0.0" bug
  if (reasoning?.includes("RSI") && reasoning?.includes("0.0")) {
    return "Analyserar marknaden...";
  }
  return reasoning || "Ingen signaldata";
}

export function SignalCard({
  type = "HOLD",
  strength = "MODERATE",
  probabilityUp = 50,
  probabilityDown = 50,
  confidence = 0,
  currentPrice = 0,
  signalPrice,
  targetPrice = 0,
  stopLoss = 0,
  reasoning = "No active signal",
  isLoading = false,
  hasData = false,
  autoExecuted = false,
  executedAt = null,
  isExecuting = false,
  rsi,
}: SignalCardProps) {
  const config = signalConfig[type];
  const Icon = config.icon;
  const { isEnabled: autoTradingEnabled } = useAutoTrading();

  const formatPrice = (value: number) => {
    if (!hasData || value === 0) return "--";
    return `$${value.toFixed(2)}`;
  };

  const formatExecutedTime = (timestamp: string | null) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-5 border-2 animate-slide-up",
        config.borderClass,
        config.glowClass,
        isLoading && "animate-pulse opacity-70"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl",
              config.bgClass,
              hasData && "animate-pulse-glow"
            )}
          >
            <Icon className={cn("h-7 w-7", config.textClass)} />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-bold", config.textClass)}>
                {config.label}
              </span>
              <span className="text-sm text-muted-foreground">{config.labelEn}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Signal: <span className={config.textClass}>{strengthLabels[strength]}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Confidence</p>
          <p className={cn("text-2xl font-bold font-mono", config.textClass)}>
            {hasData ? `${confidence}%` : "--"}
          </p>
        </div>
      </div>

      {/* Auto execution status */}
      {hasData && (
        <div className="mb-3 text-xs">
          {isExecuting && <span className="text-primary animate-pulse">Executing...</span>}
          {!isExecuting && autoExecuted && executedAt && (
            <span className="text-primary">Executed at {formatExecutedTime(executedAt)}</span>
          )}
          {!isExecuting && !autoExecuted && autoTradingEnabled && type !== "HOLD" && (
            <span className="text-primary">Auto execution enabled</span>
          )}
        </div>
      )}

      {/* Probability bars - compact */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-muted-foreground">Up</span>
            <span className="text-xs font-bold font-mono text-primary">
              {hasData ? `${probabilityUp}%` : "--"}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: hasData ? `${probabilityUp}%` : "0%" }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-muted-foreground">Down</span>
            <span className="text-xs font-bold font-mono text-destructive">
              {hasData ? `${probabilityDown}%` : "--"}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-destructive transition-all duration-500"
              style={{ width: hasData ? `${probabilityDown}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      {/* Prices - compact grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-1 mb-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase">Pris nu</span>
          </div>
          <p className="text-base font-bold font-mono text-foreground">
            {formatPrice(currentPrice)}
          </p>
          {signalPrice && signalPrice !== currentPrice && hasData && (
            <p className="text-[10px] text-muted-foreground">
              Entry: ${signalPrice.toFixed(2)}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-primary/10 p-3">
          <div className="flex items-center gap-1 mb-0.5">
            <Target className="h-3 w-3 text-primary" />
            <span className="text-[10px] text-primary uppercase">Target</span>
          </div>
          <p className="text-base font-bold font-mono text-primary">
            {formatPrice(targetPrice)}
          </p>
        </div>
        <div className="rounded-lg bg-destructive/10 p-3">
          <div className="flex items-center gap-1 mb-0.5">
            <Shield className="h-3 w-3 text-destructive" />
            <span className="text-[10px] text-destructive uppercase">Stop</span>
          </div>
          <p className="text-base font-bold font-mono text-destructive">
            {formatPrice(stopLoss)}
          </p>
        </div>
      </div>

      {/* Reasoning - with RSI fix */}
      <div className="rounded-lg bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground mb-0.5">Analys</p>
        <p className="text-sm font-medium text-foreground">
          {formatReasoning(reasoning, rsi)}
        </p>
      </div>
    </div>
  );
}
