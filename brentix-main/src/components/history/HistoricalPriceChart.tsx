import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";

interface PriceDataPoint {
  date: string;
  price: number;
}

interface HistoricalPriceChartProps {
  data: PriceDataPoint[];
}

export function HistoricalPriceChart({ data }: HistoricalPriceChartProps) {
  const chartData = useMemo(() => {
    // Downsample if too many points for performance
    const maxPoints = 500;
    if (data.length <= maxPoints) {
      return data.map((d) => ({
        date: d.date,
        price: d.price,
        displayDate: format(parseISO(d.date), "MMM d, yyyy"),
      }));
    }

    const step = Math.ceil(data.length / maxPoints);
    return data
      .filter((_, index) => index % step === 0)
      .map((d) => ({
        date: d.date,
        price: d.price,
        displayDate: format(parseISO(d.date), "MMM d, yyyy"),
      }));
  }, [data]);

  const minPrice = useMemo(() => Math.floor(Math.min(...chartData.map((d) => d.price)) * 0.95), [chartData]);
  const maxPrice = useMemo(() => Math.ceil(Math.max(...chartData.map((d) => d.price)) * 1.05), [chartData]);

  // Determine if overall trend is positive
  const isPositive = chartData.length > 1 && chartData[chartData.length - 1].price > chartData[0].price;
  const strokeColor = isPositive ? "hsl(var(--chart-2))" : "hsl(var(--chart-5))";
  const fillColor = isPositive ? "hsl(var(--chart-2))" : "hsl(var(--chart-5))";

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={fillColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis
          dataKey="date"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => {
            const date = parseISO(value);
            return format(date, chartData.length > 365 ? "yyyy" : "MMM yy");
          }}
          interval="preserveStartEnd"
          minTickGap={50}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          domain={[minPrice, maxPrice]}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelFormatter={(_, payload) => payload[0]?.payload?.displayDate || ""}
          formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={strokeColor}
          strokeWidth={1.5}
          fill="url(#priceGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
