import { Activity, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface IndicatorCardProps {
  title: string;
  value: number;
  status: string;
  statusType: "bullish" | "bearish" | "neutral";
  icon: React.ReactNode;
  details?: string;
  isLoading?: boolean;
  hasData?: boolean;
}

function IndicatorCard({ title, value, status, statusType, icon, details, isLoading, hasData }: IndicatorCardProps) {
  const statusColors = {
    bullish: "text-primary bg-primary/10",
    bearish: "text-destructive bg-destructive/10",
    neutral: "text-warning bg-warning/10",
  };

  return (
    <div className={cn("glass-card rounded-xl p-5", isLoading && "animate-pulse opacity-70")}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            {icon}
          </div>
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
      </div>
      
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold font-mono text-foreground">
          {hasData && typeof value === "number" ? value.toFixed(2) : "--"}
        </span>
      </div>

      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
          hasData ? statusColors[statusType] : "text-muted-foreground bg-muted"
        )}
      >
        {hasData && statusType === "bullish" && <TrendingUp className="h-3 w-3" />}
        {hasData && statusType === "bearish" && <TrendingDown className="h-3 w-3" />}
        {hasData && statusType === "neutral" && <Minus className="h-3 w-3" />}
        {hasData ? status : "No data"}
      </div>

      {details && hasData && (
        <p className="mt-3 text-xs text-muted-foreground">{details}</p>
      )}
    </div>
  );
}

interface TechnicalIndicatorsProps {
  rsi: number;
  macd: number;
  macdSignal: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  sma5: number;
  sma20: number;
  currentPrice: number;
  isLoading?: boolean;
  hasData?: boolean;
}

export function TechnicalIndicators({
  rsi = 0,
  macd = 0,
  macdSignal = 0,
  bollingerUpper = 0,
  bollingerMiddle = 0,
  bollingerLower = 0,
  sma5 = 0,
  sma20 = 0,
  currentPrice = 0,
  isLoading = false,
  hasData = false,
}: TechnicalIndicatorsProps) {
  // RSI Analysis
  const rsiStatus = rsi < 30 ? "Oversold" : rsi > 70 ? "Overbought" : "Neutral";
  const rsiType = rsi < 30 ? "bullish" : rsi > 70 ? "bearish" : "neutral";

  // MACD Analysis
  const macdDiff = macd - macdSignal;
  const macdStatus = macdDiff > 0 ? "Bullish" : "Bearish";
  const macdType = macdDiff > 0 ? "bullish" : "bearish";

  // Bollinger Analysis
  const bbPosition =
    currentPrice > bollingerUpper
      ? "Above Upper"
      : currentPrice < bollingerLower
      ? "Below Lower"
      : "Within Bands";
  const bbType =
    currentPrice > bollingerUpper ? "bearish" : currentPrice < bollingerLower ? "bullish" : "neutral";

  // Trend Analysis
  const trend = sma5 > sma20 ? "Uptrend" : sma5 < sma20 ? "Downtrend" : "Sideways";
  const trendType = sma5 > sma20 ? "bullish" : sma5 < sma20 ? "bearish" : "neutral";
  const trendStrength = Math.abs(((sma5 - sma20) / (sma20 || 1)) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
      <IndicatorCard
        title="RSI (14)"
        value={rsi}
        status={rsiStatus}
        statusType={rsiType}
        icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        details={hasData ? `${rsi < 30 ? "Strong buy signal" : rsi > 70 ? "Strong sell signal" : "Wait for clearer signal"}` : undefined}
        isLoading={isLoading}
        hasData={hasData}
      />
      
      <IndicatorCard
        title="MACD"
        value={macd}
        status={macdStatus}
        statusType={macdType}
        icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
        details={hasData ? `Signal: ${macdSignal.toFixed(2)} | Histogram: ${macdDiff.toFixed(3)}` : undefined}
        isLoading={isLoading}
        hasData={hasData}
      />
      
      <IndicatorCard
        title="Bollinger Bands"
        value={bollingerMiddle}
        status={bbPosition}
        statusType={bbType}
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        details={hasData ? `Upper: $${bollingerUpper.toFixed(2)} | Lower: $${bollingerLower.toFixed(2)}` : undefined}
        isLoading={isLoading}
        hasData={hasData}
      />
      
      <IndicatorCard
        title="Trend (SMA)"
        value={trendStrength}
        status={trend}
        statusType={trendType}
        icon={
          trend === "Uptrend" ? (
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          ) : trend === "Downtrend" ? (
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground" />
          )
        }
        details={hasData ? `SMA5: $${sma5.toFixed(2)} | SMA20: $${sma20.toFixed(2)}` : undefined}
        isLoading={isLoading}
        hasData={hasData}
      />
    </div>
  );
}
