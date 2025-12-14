import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subHours, subDays, subWeeks, subMonths } from "date-fns";

export type TimeRange = "1H" | "4H" | "1D" | "1W" | "1M";

interface PricePoint {
  time: string;
  price: number;
  high: number;
  low: number;
}

const getRangeConfig = (range: TimeRange) => {
  const now = new Date();
  
  switch (range) {
    case "1H":
      return { from: subHours(now, 1), limit: 60, formatStr: "HH:mm" };
    case "4H":
      return { from: subHours(now, 4), limit: 48, formatStr: "HH:mm" };
    case "1D":
      return { from: subDays(now, 1), limit: 288, formatStr: "HH:mm" };
    case "1W":
      return { from: subWeeks(now, 1), limit: 168, formatStr: "EEE HH:mm" };
    case "1M":
      return { from: subMonths(now, 1), limit: 720, formatStr: "dd MMM" };
    default:
      return { from: subDays(now, 1), limit: 288, formatStr: "HH:mm" };
  }
};

export function usePriceHistory(range: TimeRange) {
  return useQuery({
    queryKey: ["price-history", range],
    queryFn: async (): Promise<PricePoint[]> => {
      const config = getRangeConfig(range);
      
      const { data, error } = await supabase
        .from("price_data")
        .select("timestamp, close, high, low")
        .gte("timestamp", config.from.toISOString())
        .order("timestamp", { ascending: true })
        .limit(config.limit);

      if (error) {
        console.error("Error fetching price history:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Gruppera och sampla data beroende på tidsintervall
      const points: PricePoint[] = data.map((p) => ({
        time: format(new Date(p.timestamp), config.formatStr),
        price: Number(p.close),
        high: Number(p.high),
        low: Number(p.low),
      }));

      // Sampla om för stora dataset för prestanda
      if (points.length > 100) {
        const step = Math.ceil(points.length / 100);
        return points.filter((_, i) => i % step === 0);
      }

      return points;
    },
    refetchInterval: 60000, // Uppdatera varje minut
    staleTime: 30000, // Data är "färsk" i 30 sekunder
  });
}
