import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export interface HistoricalPriceRow {
  id: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  source: string | null;
  // Computed fields from the VIEW
  day_of_week?: number;
  hour_of_day?: number;
  minute_of_hour?: number;
  price_change?: number;
  price_change_percent?: number;
  price_range?: number;
}

export interface HistoricalDataFilters {
  startDate?: Date;
  endDate?: Date;
  dayOfWeek?: number | null; // 0-6
  hourOfDay?: number | null; // 0-23
  source?: string | null;
}

interface UseHistoricalDataOptions {
  pageSize?: number;
  filters?: HistoricalDataFilters;
}

interface UseHistoricalDataResult {
  data: HistoricalPriceRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  error: Error | null;
  setPage: (page: number) => void;
  refetch: () => void;
}

export function useHistoricalData(
  options: UseHistoricalDataOptions = {}
): UseHistoricalDataResult {
  const { pageSize = 50, filters = {} } = options;
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["prisanalys-historical-data", page, pageSize, filters],
    queryFn: async () => {
      // Build query with filters
      let query = supabase
        .from("price_data")
        .select("*", { count: "exact" })
        .order("timestamp", { ascending: false });

      // Apply date range filter
      if (filters.startDate) {
        query = query.gte("timestamp", filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte("timestamp", filters.endDate.toISOString());
      }

      // Apply source filter
      if (filters.source) {
        query = query.eq("source", filters.source);
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: priceData, error: priceError, count } = await query;

      if (priceError) throw priceError;

      // Compute additional fields that would come from the VIEW
      const enrichedData = (priceData ?? []).map((row) => {
        const timestamp = new Date(row.timestamp);
        return {
          ...row,
          day_of_week: timestamp.getDay(),
          hour_of_day: timestamp.getHours(),
          minute_of_hour: timestamp.getMinutes(),
          price_change: row.close - row.open,
          price_change_percent:
            row.open > 0 ? ((row.close - row.open) / row.open) * 100 : 0,
          price_range: row.high - row.low,
        };
      });

      // Filter by day of week and hour (client-side since VIEW filters are complex)
      let filteredData = enrichedData;
      if (filters.dayOfWeek !== undefined && filters.dayOfWeek !== null) {
        filteredData = filteredData.filter(
          (row) => row.day_of_week === filters.dayOfWeek
        );
      }
      if (filters.hourOfDay !== undefined && filters.hourOfDay !== null) {
        filteredData = filteredData.filter(
          (row) => row.hour_of_day === filters.hourOfDay
        );
      }

      return {
        data: filteredData as HistoricalPriceRow[],
        totalCount: count ?? 0,
      };
    },
    staleTime: 30000, // 30 seconds
  });

  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: data?.data ?? [],
    totalCount,
    page,
    pageSize,
    totalPages,
    isLoading,
    error: error as Error | null,
    setPage,
    refetch,
  };
}

// Export function for CSV export
export function exportToCSV(data: HistoricalPriceRow[], filename: string): void {
  const headers = [
    "Timestamp",
    "Open",
    "High",
    "Low",
    "Close",
    "Volume",
    "Change",
    "Change %",
    "Range",
    "Day",
    "Hour",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const rows = data.map((row) => [
    row.timestamp,
    row.open.toFixed(4),
    row.high.toFixed(4),
    row.low.toFixed(4),
    row.close.toFixed(4),
    (row.volume ?? 0).toFixed(2),
    (row.price_change ?? 0).toFixed(4),
    (row.price_change_percent ?? 0).toFixed(4),
    (row.price_range ?? 0).toFixed(4),
    dayNames[row.day_of_week ?? 0],
    row.hour_of_day?.toString().padStart(2, "0") ?? "00",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
