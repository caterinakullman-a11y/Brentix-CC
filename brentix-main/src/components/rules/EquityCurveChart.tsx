import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";

interface EquityCurveData {
  date: string;
  equity: number;
}

interface EquityCurveChartProps {
  data: EquityCurveData[];
  initialCapital?: number;
}

export function EquityCurveChart({ data, initialCapital = 100000 }: EquityCurveChartProps) {
  const chartData = useMemo(() => {
    // Downsample for performance
    const maxPoints = 100;
    const step = Math.max(1, Math.floor(data.length / maxPoints));
    
    return data
      .filter((_, i) => i % step === 0 || i === data.length - 1)
      .map((d) => ({
        date: d.date,
        equity: d.equity,
        formatted: format(parseISO(d.date), "yyyy-MM-dd"),
      }));
  }, [data]);

  const minEquity = Math.min(...chartData.map((d) => d.equity));
  const maxEquity = Math.max(...chartData.map((d) => d.equity));
  const finalEquity = chartData[chartData.length - 1]?.equity || initialCapital;
  const isProfit = finalEquity >= initialCapital;

  if (chartData.length < 2) {
    return (
      <div className="h-24 flex items-center justify-center text-muted-foreground text-xs">
        Ingen data
      </div>
    );
  }

  return (
    <div className="h-24 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis dataKey="formatted" hide />
          <YAxis 
            domain={[minEquity * 0.99, maxEquity * 1.01]} 
            hide 
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [
              `${value.toLocaleString("sv-SE")} SEK`,
              "Kapital",
            ]}
            labelFormatter={(label) => label}
          />
          <ReferenceLine 
            y={initialCapital} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="3 3" 
            strokeOpacity={0.5}
          />
          <Line
            type="monotone"
            dataKey="equity"
            stroke={isProfit ? "#5B9A6F" : "#9A5B5B"}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
