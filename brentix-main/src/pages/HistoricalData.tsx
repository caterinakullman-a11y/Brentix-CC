import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useHistoricalPrices,
  useHistoricalDataCount,
  type DateRangePreset
} from "@/hooks/useHistoricalPrices";
import { usePatternOccurrences, useDetectPatterns } from "@/hooks/usePatterns";
import { HistoricalPriceChart } from "@/components/history/HistoricalPriceChart";
import { PriceStatisticsCard } from "@/components/history/PriceStatisticsCard";
import { PatternList } from "@/components/history/PatternList";
import { PatternDefinitionsList } from "@/components/history/PatternDefinitionsList";
import { RefreshCw, Database, TrendingUp, Sparkles, Activity } from "lucide-react";
import { toast } from "sonner";
import { subYears, format } from "date-fns";

const dateRangeOptions: { value: DateRangePreset; label: string }[] = [
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "5Y", label: "5Y" },
  { value: "10Y", label: "10Y" },
  { value: "ALL", label: "All" },
];

export default function HistoricalData() {
  const [dateRange, setDateRange] = useState<DateRangePreset>("1Y");
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  
  const { prices, statistics, isLoading, error } = useHistoricalPrices(dateRange);
  const { data: totalCount, isLoading: countLoading } = useHistoricalDataCount();
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
        <meta name="description" content="Brent crude oil price history with pattern recognition" />
      </Helmet>
      <div className="p-4 md:p-6 space-y-6">
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

          {/* Date Range Selector */}
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

          {/* Main Content Tabs */}
          <Tabs defaultValue="chart" className="space-y-4">
            <TabsList>
              <TabsTrigger value="chart" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Price Chart
              </TabsTrigger>
              <TabsTrigger value="patterns" className="gap-2">
                <Activity className="h-4 w-4" />
                Patterns
                {patterns && patterns.length > 0 && (
                  <span className="ml-1 text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">
                    {patterns.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="space-y-4">
              <Card className="border-0 bg-card/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Price History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[400px] w-full" />
                  ) : error ? (
                    <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                      Error loading data: {error.message}
                    </div>
                  ) : prices.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-4">
                      <Database className="h-12 w-12 opacity-50" />
                      <div className="text-center">
                        <p className="font-medium">Ingen prisdata tillgänglig</p>
                        <p className="text-sm">Prisdata laddas från price_data tabellen</p>
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
    </>
  );
}
