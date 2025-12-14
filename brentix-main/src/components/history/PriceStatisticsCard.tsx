import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";

interface PriceStatistics {
  count: number;
  min: number;
  max: number;
  avg: number;
  firstDate: string;
  lastDate: string;
  change: number;
  changePercent: number;
}

interface PriceStatisticsCardProps {
  statistics: PriceStatistics | null;
  isLoading: boolean;
}

export function PriceStatisticsCard({ statistics, isLoading }: PriceStatisticsCardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-0 bg-card/50">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!statistics) return null;

  const isPositive = statistics.change >= 0;

  const stats = [
    {
      label: "Period Change",
      value: `${isPositive ? "+" : ""}${statistics.changePercent.toFixed(1)}%`,
      subValue: `${isPositive ? "+" : ""}$${statistics.change.toFixed(2)}`,
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? "text-chart-2" : "text-chart-5",
    },
    {
      label: "Low",
      value: `$${statistics.min.toFixed(2)}`,
      subValue: "Period minimum",
      icon: ArrowDown,
      color: "text-chart-5",
    },
    {
      label: "High",
      value: `$${statistics.max.toFixed(2)}`,
      subValue: "Period maximum",
      icon: ArrowUp,
      color: "text-chart-2",
    },
    {
      label: "Average",
      value: `$${statistics.avg.toFixed(2)}`,
      subValue: `${statistics.count.toLocaleString()} data points`,
      icon: DollarSign,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-0 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div className={`text-xl font-semibold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{stat.subValue}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
