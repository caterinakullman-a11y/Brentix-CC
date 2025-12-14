import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TrailingStopChartProps {
  currentPrice: number;
  triggerPrice: number;
  peakPrice?: number;
  troughPrice?: number;
  trailingPercent: number;
  direction: "BUY" | "SELL";
  priceHistory?: { time: string; price: number }[];
}

export function TrailingStopChart({
  currentPrice,
  triggerPrice,
  peakPrice,
  troughPrice,
  trailingPercent,
  direction,
  priceHistory = [],
}: TrailingStopChartProps) {
  // Generate simulated price history if not provided
  const chartData = useMemo(() => {
    if (priceHistory.length > 0) {
      return priceHistory.map((p, i) => {
        // Calculate trailing trigger at each point
        let trailingTrigger = triggerPrice;
        if (direction === "SELL" && peakPrice) {
          const maxPrice = Math.max(...priceHistory.slice(0, i + 1).map(pp => pp.price));
          trailingTrigger = maxPrice * (1 - trailingPercent / 100);
        } else if (direction === "BUY" && troughPrice) {
          const minPrice = Math.min(...priceHistory.slice(0, i + 1).map(pp => pp.price));
          trailingTrigger = minPrice * (1 + trailingPercent / 100);
        }
        return {
          ...p,
          trigger: trailingTrigger,
        };
      });
    }

    // Generate sample data showing how trailing stop works
    const basePrice = peakPrice || troughPrice || currentPrice;
    const points: { time: string; price: number; trigger: number }[] = [];
    
    if (direction === "SELL") {
      // Show price rising then falling with trailing stop following
      let runningPeak = basePrice * 0.97;
      for (let i = 0; i < 20; i++) {
        const variance = Math.sin(i * 0.5) * 0.02 + (i < 12 ? i * 0.003 : (20 - i) * 0.004);
        const price = basePrice * (1 + variance);
        runningPeak = Math.max(runningPeak, price);
        const trigger = runningPeak * (1 - trailingPercent / 100);
        points.push({
          time: `T${i}`,
          price: Number(price.toFixed(2)),
          trigger: Number(trigger.toFixed(2)),
        });
      }
    } else {
      // Show price falling then rising with trailing stop following
      let runningTrough = basePrice * 1.03;
      for (let i = 0; i < 20; i++) {
        const variance = -Math.sin(i * 0.5) * 0.02 - (i < 12 ? i * 0.003 : (20 - i) * 0.004);
        const price = basePrice * (1 + variance);
        runningTrough = Math.min(runningTrough, price);
        const trigger = runningTrough * (1 + trailingPercent / 100);
        points.push({
          time: `T${i}`,
          price: Number(price.toFixed(2)),
          trigger: Number(trigger.toFixed(2)),
        });
      }
    }
    
    return points;
  }, [priceHistory, currentPrice, triggerPrice, peakPrice, troughPrice, trailingPercent, direction]);

  const minPrice = Math.min(...chartData.map(d => Math.min(d.price, d.trigger))) * 0.995;
  const maxPrice = Math.max(...chartData.map(d => Math.max(d.price, d.trigger))) * 1.005;

  const referencePrice = direction === "SELL" ? peakPrice : troughPrice;
  const distanceToTrigger = currentPrice > 0 && triggerPrice > 0
    ? ((currentPrice - triggerPrice) / currentPrice * 100).toFixed(2)
    : "0";

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {direction === "SELL" ? (
              <TrendingDown className="h-4 w-4 text-[#9A5B5B]" />
            ) : (
              <TrendingUp className="h-4 w-4 text-[#5B9A6F]" />
            )}
            Trailing Stop Visualisering
          </div>
          <Badge variant="outline" className="text-xs">
            {trailingPercent}% trail
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-background/50 p-2 rounded text-center">
            <div className="text-muted-foreground">Aktuellt</div>
            <div className="font-mono font-medium">${currentPrice.toFixed(2)}</div>
          </div>
          <div className="bg-background/50 p-2 rounded text-center">
            <div className="text-muted-foreground">
              {direction === "SELL" ? "Peak" : "Trough"}
            </div>
            <div className={`font-mono font-medium ${direction === "SELL" ? "text-[#5B9A6F]" : "text-[#9A5B5B]"}`}>
              ${(referencePrice || currentPrice).toFixed(2)}
            </div>
          </div>
          <div className="bg-background/50 p-2 rounded text-center">
            <div className="text-muted-foreground">Trigger</div>
            <div className="font-mono font-medium text-amber-500">${triggerPrice.toFixed(2)}</div>
          </div>
        </div>

        {/* Distance indicator */}
        <div className="flex items-center justify-between text-xs bg-background/50 p-2 rounded">
          <span className="text-muted-foreground">Avstånd till trigger:</span>
          <span className={`font-mono font-medium ${
            Math.abs(parseFloat(distanceToTrigger)) < 1 ? "text-amber-500" : "text-foreground"
          }`}>
            {distanceToTrigger}%
          </span>
        </div>

        {/* Chart */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                domain={[minPrice, maxPrice]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="none"
                fill="url(#priceGradient)"
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Pris"
              />
              <Line
                type="stepAfter"
                dataKey="trigger"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Trigger"
              />
              {referencePrice && (
                <ReferenceLine 
                  y={referencePrice} 
                  stroke={direction === "SELL" ? "#5B9A6F" : "#9A5B5B"} 
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-primary" />
            <span className="text-muted-foreground">Pris</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-amber-500" style={{ borderStyle: "dashed" }} />
            <span className="text-muted-foreground">Trailing Trigger</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-3 h-0.5 ${direction === "SELL" ? "bg-[#5B9A6F]" : "bg-[#9A5B5B]"}`} />
            <span className="text-muted-foreground">{direction === "SELL" ? "Peak" : "Trough"}</span>
          </div>
        </div>

        {/* Explanation */}
        <p className="text-xs text-muted-foreground text-center">
          {direction === "SELL" 
            ? `Trigger följer ${trailingPercent}% under högsta pris och utlöser vid prisfall`
            : `Trigger följer ${trailingPercent}% över lägsta pris och utlöser vid prisuppgång`
          }
        </p>
      </CardContent>
    </Card>
  );
}
