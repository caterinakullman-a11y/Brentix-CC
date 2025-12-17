import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useHistoricalPrices,
  useImportHistoricalData,
  useHistoricalDataCount,
  type DateRangePreset
} from "@/hooks/useHistoricalPrices";
import { usePriceHistoryWithInterval, type DataInterval } from "@/hooks/usePriceHistory";
import { usePatternOccurrences, useDetectPatterns } from "@/hooks/usePatterns";
import { HistoricalPriceChart } from "@/components/history/HistoricalPriceChart";
import { PriceStatisticsCard } from "@/components/history/PriceStatisticsCard";
import { PatternList } from "@/components/history/PatternList";
import { PatternDefinitionsList } from "@/components/history/PatternDefinitionsList";
import { ChartTimeControls, type TimePreset } from "@/components/history/ChartTimeControls";
import { Download, RefreshCw, Database, TrendingUp, Sparkles, Activity } from "lucide-react";
import { toast } from "sonner";
import { subYears, subMonths, subWeeks, subDays, subHours, format } from "date-fns";

const dateRangeOptions: { value: DateRangePreset; label: string }[] = [
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "5Y", label: "5Y" },
  { value: "10Y", label: "10Y" },
  { value: "ALL", label: "All" },
];

// Helper to get initial time range
function getInitialTimeRange() {
  const now = new Date();
  return { from: subDays(now, 1), to: now };
}

// Helper to get default interval for a preset
function getDefaultIntervalForPreset(preset: TimePreset): DataInterval {
  switch (preset) {
    case "1H": return "1m";
    case "24H": return "15m";
    case "1W": return "1h";
    case "1M": return "4h";
    case "1Y": return "1d";
    default: return "1h";
  }
}

export default function HistoricalData() {
  const [dateRange, setDateRange] = useState<DateRangePreset>("1Y");
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);

  // New state for enhanced time controls
  const [timeRange, setTimeRange] = useState(getInitialTimeRange);
  const [interval, setInterval] = useState<DataInterval>("15m");
  const [activeTab, setActiveTab] = useState<"chart" | "historical">("chart");

  const { prices, statistics, isLoading, error } = useHistoricalPrices(dateRange);

  // Use the new hook for the enhanced chart
  const {
    data: realtimeData,
    statistics: realtimeStats,
    isLoading: realtimeLoading,
    error: realtimeError
  } = usePriceHistoryWithInterval(timeRange, interval);

  const handleTimeRangeChange = useCallback((range: { from: Date; to: Date }) => {
    setTimeRange(range);
  }, []);

  const handleIntervalChange = useCallback((newInterval: DataInterval) => {
    setInterval(newInterval);
  }, []);
  const { data: totalCount, isLoading: countLoading } = useHistoricalDataCount();
  const importMutation = useImportHistoricalData();
  const detectMutation = useDetectPatterns();

  // Get date range for pattern query
  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = dateRange === "ALL" ? undefined : format(
    dateRange === "1M" ? subYears(new Date(), 0.083) :
    dateRange === "3M" ? subYears(new Date(), 0.25) :
    dateRange === "6M" ? subYears(new Date(), 0.5) :
    dateRange === "1Y" ? subYears(new Date(), 1) :
    dateRange === "5Y" ? subYears(new Date(), 5) :
    subYears(new Date(), 10),
    "yyyy-MM-dd"
  );

  const { data: patterns, isLoading: patternsLoading } = usePatternOccurrences(
    startDate,
    endDate,
    selectedPatterns.length > 0 ? selectedPatterns : undefined
  );

  const handleImport = async () => {
    try {
      const result = await importMutation.mutateAsync();
      if (result.insertedCount > 0) {
        toast.success(`Imported ${result.insertedCount} price records`);
      } else {
        toast.info(result.message || "Data is already up to date");
      }
    } catch (err) {
      toast.error("Failed to import data: " + (err as Error).message);
    }
  };

  const handleDetectPatterns = async () => {
    try {
      const result = await detectMutation.mutateAsync({ start_date: startDate, end_date: endDate });
      toast.success(`Detected ${result.patterns_found} patterns`);
    } catch (err) {
      toast.error("Failed to detect patterns: " + (err as Error).message);
    }
  };

  const togglePattern = (patternType: string) => {
    setSelectedPatterns(prev => 
      prev.includes(patternType) 
        ? prev.filter(p => p !== patternType)
        : [...prev, patternType]
    );
  };

  return (
    <>
      <Helmet>
        <title>Historical Data | Brentix</title>
        <meta name="description" content="37 years of Brent crude oil price history with pattern recognition" />
      </Helmet>
      <MainLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Historical Data</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Brent Crude Oil prices with pattern recognition
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                {countLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  <span>{totalCount?.toLocaleString() ?? 0} records</span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImport}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {totalCount === 0 ? "Import" : "Update"}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleDetectPatterns}
                disabled={detectMutation.isPending || (totalCount ?? 0) < 50}
              >
                {detectMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Detect Patterns
              </Button>
            </div>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="realtime" className="space-y-4">
            <TabsList>
              <TabsTrigger value="realtime" className="gap-2">
                <Activity className="h-4 w-4" />
                Realtidspris
              </TabsTrigger>
              <TabsTrigger value="chart" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Historik
              </TabsTrigger>
              <TabsTrigger value="patterns" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Mönster
                {patterns && patterns.length > 0 && (
                  <span className="ml-1 text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
                    {patterns.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Realtime Chart with Time Controls */}
            <TabsContent value="realtime" className="space-y-4">
              <Card className="border-0 bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    Realtidspris - Brent Crude Oil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Time Controls */}
                  <ChartTimeControls
                    onTimeRangeChange={handleTimeRangeChange}
                    onIntervalChange={handleIntervalChange}
                    selectedPreset="24H"
                    selectedInterval={interval}
                  />

                  {/* Statistics for current view */}
                  {realtimeStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">Senaste</p>
                        <p className="text-lg font-semibold">${realtimeStats.avg.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Förändring</p>
                        <p className={`text-lg font-semibold ${realtimeStats.changePercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {realtimeStats.changePercent >= 0 ? "+" : ""}{realtimeStats.changePercent.toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Högsta</p>
                        <p className="text-lg font-semibold">${realtimeStats.max.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lägsta</p>
                        <p className="text-lg font-semibold">${realtimeStats.min.toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  {/* Chart */}
                  {realtimeLoading ? (
                    <Skeleton className="h-[400px] w-full" />
                  ) : realtimeError ? (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      Fel vid laddning: {realtimeError.message}
                    </div>
                  ) : realtimeData.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-4">
                      <Database className="h-12 w-12 opacity-50" />
                      <div className="text-center">
                        <p className="font-medium">Ingen prisdata tillgänglig</p>
                        <p className="text-sm">Väntar på data för vald tidsperiod</p>
                      </div>
                    </div>
                  ) : (
                    <HistoricalPriceChart
                      data={realtimeData.map(d => ({ date: d.date, price: d.price }))}
                    />
                  )}

                  {/* Data point count */}
                  {realtimeData.length > 0 && (
                    <p className="text-xs text-muted-foreground text-right">
                      {realtimeData.length} datapunkter
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Historical Chart Tab */}
            <TabsContent value="chart" className="space-y-4">
              {/* Date Range Selector for Historical */}
              <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
                {dateRangeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={dateRange === option.value ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setDateRange(option.value)}
                    className="px-3"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              {/* Statistics Cards */}
              {statistics && <PriceStatisticsCard statistics={statistics} isLoading={isLoading} />}

              <Card className="border-0 bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Historisk prisdata
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[400px] w-full" />
                  ) : error ? (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      Fel vid laddning: {error.message}
                    </div>
                  ) : prices.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-4">
                      <Database className="h-12 w-12 opacity-50" />
                      <div className="text-center">
                        <p className="font-medium">Ingen historisk data</p>
                        <p className="text-sm">Klicka "Import" för att hämta 37 års prishistorik</p>
                      </div>
                    </div>
                  ) : (
                    <HistoricalPriceChart data={prices} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="patterns" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pattern Definitions */}
                <div className="lg:col-span-1">
                  <Card className="border-0 bg-card/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium">
                        Pattern Types
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Click to filter detected patterns
                      </p>
                    </CardHeader>
                    <CardContent>
                      <PatternDefinitionsList 
                        onSelectPattern={togglePattern}
                        selectedPatterns={selectedPatterns}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Detected Patterns */}
                <div className="lg:col-span-2">
                  <Card className="border-0 bg-card/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium">
                          Detected Patterns
                        </CardTitle>
                        {selectedPatterns.length > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedPatterns([])}
                          >
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <PatternList 
                        patterns={patterns ?? []} 
                        isLoading={patternsLoading} 
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </>
  );
}
