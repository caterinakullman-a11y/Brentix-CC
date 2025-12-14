import { useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { usePriceHistory, TimeRange } from "@/hooks/usePriceHistory";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const timeRanges: TimeRange[] = ["1H", "4H", "1D", "1W", "1M"];

function ChartSkeleton() {
  return (
    <div className="h-[300px] flex items-center justify-center">
      <div className="space-y-3 w-full">
        <Skeleton className="h-4 w-3/4 mx-auto" />
        <Skeleton className="h-[250px] w-full" />
      </div>
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
      <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
      <p className="text-lg font-medium">Ingen prisdata tillgänglig</p>
      <p className="text-sm">Väntar på datainsamling...</p>
    </div>
  );
}

function ChartError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
      <AlertCircle className="h-12 w-12 mb-4 text-destructive opacity-50" />
      <p className="text-lg font-medium">Kunde inte ladda prisdata</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Försök igen
      </Button>
    </div>
  );
}

export function PriceChart() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("1D");
  const { data, isLoading, error, refetch } = usePriceHistory(selectedRange);

  // Beräkna om trenden är positiv
  const isPositive = data && data.length >= 2 
    ? data[data.length - 1].price >= data[0].price 
    : true;

  return (
    <div className="glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Prisdiagram</h3>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                selectedRange === range
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[300px]">
        {isLoading ? (
          <ChartSkeleton />
        ) : error ? (
          <ChartError onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <ChartEmpty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="priceGradientPositive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="priceGradientNegative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                domain={["dataMin - 0.5", "dataMax + 0.5"]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                itemStyle={{ color: isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Pris"]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                strokeWidth={2}
                fill={isPositive ? "url(#priceGradientPositive)" : "url(#priceGradientNegative)"}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
