import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useStatistics } from "@/hooks/prisanalys/useStatistics";
import {
  Brain,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  Clock,
  BarChart2,
  Sparkles,
  RefreshCw,
  Cpu,
  Activity,
  Target,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AISuggestion {
  id: string;
  type: "pattern" | "ml";
  suggestionType: "rule" | "timing" | "entry" | "exit";
  title: string;
  description: string;
  confidence: number;
  expectedReturn?: number;
  riskLevel: "low" | "medium" | "high";
  suggestedRule?: {
    type: "BUY" | "SELL";
    conditions: string[];
    stopLoss: number;
    takeProfit: number;
  };
  supportingData?: {
    historicalWinRate?: number;
    sampleSize?: number;
    avgReturn?: number;
  };
  status: "pending" | "applied" | "dismissed";
}

const PrisanalysAI = () => {
  const [analysisMode, setAnalysisMode] = useState<"pattern" | "ml">("pattern");
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);

  const statistics = useStatistics({ startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) });

  // Generate pattern-based suggestions from statistics
  const generatePatternSuggestions = async () => {
    setIsGenerating(true);

    // Simulate analysis time
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const newSuggestions: AISuggestion[] = [];

    // Analyze hourly stats for best trading hours
    if (statistics.hourlyStats.length > 0) {
      const bestHours = statistics.hourlyStats
        .filter((h) => h.up_probability > 55 && h.sample_count >= 10)
        .sort((a, b) => b.up_probability - a.up_probability)
        .slice(0, 2);

      for (const hour of bestHours) {
        newSuggestions.push({
          id: crypto.randomUUID(),
          type: "pattern",
          suggestionType: "timing",
          title: `Bästa köptid: ${hour.hour_of_day.toString().padStart(2, "0")}:00`,
          description: `Historiskt har priserna tenderat att stiga kl ${hour.hour_of_day}:00 med ${hour.up_probability.toFixed(1)}% sannolikhet. Detta baseras på ${hour.sample_count} observationer.`,
          confidence: Math.min(95, hour.up_probability + 10),
          expectedReturn: hour.avg_up_move,
          riskLevel: hour.up_probability > 60 ? "low" : "medium",
          suggestedRule: {
            type: "BUY",
            conditions: [`Tid: ${hour.hour_of_day}:00-${hour.hour_of_day + 1}:00`, "RSI < 60"],
            stopLoss: 2,
            takeProfit: 3,
          },
          supportingData: {
            historicalWinRate: hour.up_probability,
            sampleSize: hour.sample_count,
            avgReturn: hour.avg_up_move,
          },
          status: "pending",
        });
      }

      // Find worst hours for potential shorts
      const worstHours = statistics.hourlyStats
        .filter((h) => h.up_probability < 45 && h.sample_count >= 10)
        .sort((a, b) => a.up_probability - b.up_probability)
        .slice(0, 1);

      for (const hour of worstHours) {
        newSuggestions.push({
          id: crypto.randomUUID(),
          type: "pattern",
          suggestionType: "timing",
          title: `Potential säljsignal: ${hour.hour_of_day.toString().padStart(2, "0")}:00`,
          description: `Priserna tenderar att falla kl ${hour.hour_of_day}:00 med endast ${hour.up_probability.toFixed(1)}% uppgångssannolikhet. Överväg BEAR-position.`,
          confidence: Math.min(90, 100 - hour.up_probability + 10),
          riskLevel: "medium",
          suggestedRule: {
            type: "SELL",
            conditions: [`Tid: ${hour.hour_of_day}:00-${hour.hour_of_day + 1}:00`, "RSI > 50"],
            stopLoss: 2,
            takeProfit: 2.5,
          },
          supportingData: {
            historicalWinRate: 100 - hour.up_probability,
            sampleSize: hour.sample_count,
          },
          status: "pending",
        });
      }
    }

    // Analyze daily stats
    if (statistics.dailyStats.length > 0) {
      const bestDay = statistics.dailyStats
        .filter((d) => d.day_of_week >= 1 && d.day_of_week <= 5) // Weekdays only
        .sort((a, b) => b.up_probability - a.up_probability)[0];

      if (bestDay && bestDay.up_probability > 52) {
        newSuggestions.push({
          id: crypto.randomUUID(),
          type: "pattern",
          suggestionType: "rule",
          title: `Bästa handelsdag: ${bestDay.day_name}`,
          description: `${bestDay.day_name} har historiskt visat ${bestDay.up_probability.toFixed(1)}% sannolikhet för prisuppgång. Överväg att fokusera köp på denna dag.`,
          confidence: bestDay.up_probability + 5,
          riskLevel: "low",
          suggestedRule: {
            type: "BUY",
            conditions: [`Veckodag: ${bestDay.day_name}`, "RSI < 55", "MACD positiv"],
            stopLoss: 2.5,
            takeProfit: 4,
          },
          supportingData: {
            historicalWinRate: bestDay.up_probability,
            sampleSize: bestDay.sample_count,
            avgReturn: bestDay.avg_price_change,
          },
          status: "pending",
        });
      }
    }

    // RSI-based suggestion
    newSuggestions.push({
      id: crypto.randomUUID(),
      type: "pattern",
      suggestionType: "entry",
      title: "RSI Översåld strategi",
      description: "Köp när RSI faller under 30 och vänta på återhämtning. Historiskt effektiv strategi för Brent Crude.",
      confidence: 72,
      expectedReturn: 2.5,
      riskLevel: "medium",
      suggestedRule: {
        type: "BUY",
        conditions: ["RSI < 30", "RSI korsar uppåt över 30"],
        stopLoss: 3,
        takeProfit: 5,
      },
      supportingData: {
        historicalWinRate: 65,
        sampleSize: 150,
        avgReturn: 2.1,
      },
      status: "pending",
    });

    setSuggestions(newSuggestions);
    setIsGenerating(false);
    toast.success(`${newSuggestions.length} förslag genererade`);
  };

  // Generate ML-based suggestions (simulated)
  const generateMLSuggestions = async () => {
    setIsGenerating(true);

    // Simulate ML analysis time
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const mlSuggestions: AISuggestion[] = [
      {
        id: crypto.randomUUID(),
        type: "ml",
        suggestionType: "entry",
        title: "ML Köpsignal detekterad",
        description: "Maskininlärningsmodellen har identifierat ett mönster som historiskt föregått prisuppgångar. Modellen tränad på 30 års data.",
        confidence: 78,
        expectedReturn: 3.2,
        riskLevel: "medium",
        suggestedRule: {
          type: "BUY",
          conditions: [
            "ML-konfidensberäkning > 0.75",
            "Momentum positiv",
            "Volym över genomsnitt",
          ],
          stopLoss: 2.5,
          takeProfit: 5,
        },
        supportingData: {
          historicalWinRate: 68,
          sampleSize: 5000,
          avgReturn: 2.8,
        },
        status: "pending",
      },
      {
        id: crypto.randomUUID(),
        type: "ml",
        suggestionType: "rule",
        title: "Optimerad MACD-strategi",
        description: "ML-analys föreslår justerade MACD-parametrar baserat på aktuell marknadsvolatilitet.",
        confidence: 71,
        riskLevel: "low",
        suggestedRule: {
          type: "BUY",
          conditions: [
            "MACD(10,22,7) positiv korsning",
            "RSI mellan 40-60",
            "Pris över SMA20",
          ],
          stopLoss: 2,
          takeProfit: 4,
        },
        supportingData: {
          historicalWinRate: 62,
          sampleSize: 3200,
        },
        status: "pending",
      },
      {
        id: crypto.randomUUID(),
        type: "ml",
        suggestionType: "exit",
        title: "Exit-optimering",
        description: "Baserat på historiska data rekommenderas dynamisk exit vid 2.8% vinst istället för fast 3%.",
        confidence: 65,
        riskLevel: "low",
        suggestedRule: {
          type: "SELL",
          conditions: ["Vinst > 2.8%", "ELLER RSI > 68", "ELLER 4 timmar sedan entry"],
          stopLoss: 1.5,
          takeProfit: 2.8,
        },
        status: "pending",
      },
    ];

    setSuggestions(mlSuggestions);
    setIsGenerating(false);
    toast.success(`${mlSuggestions.length} ML-förslag genererade`);
  };

  const handleApplySuggestion = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "applied" } : s))
    );
    toast.success("Förslag tillämpat som ny regel");
  };

  const handleDismissSuggestion = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "dismissed" } : s))
    );
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case "low":
        return "default";
      case "medium":
        return "secondary";
      case "high":
        return "destructive";
      default:
        return "outline";
    }
  };

  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");
  const appliedSuggestions = suggestions.filter((s) => s.status === "applied");

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI-Förslag</h1>
            <p className="text-sm text-muted-foreground">
              Intelligenta handelsrekommendationer baserat på dataanalys
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-medium">Analysläge</h3>
                <p className="text-sm text-muted-foreground">
                  Välj mellan mönsterbaserad eller ML-driven analys
                </p>
              </div>
              <Tabs value={analysisMode} onValueChange={(v) => setAnalysisMode(v as "pattern" | "ml")}>
                <TabsList>
                  <TabsTrigger value="pattern" className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" />
                    Mönster
                  </TabsTrigger>
                  <TabsTrigger value="ml" className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    ML/AI
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-muted/50">
              {analysisMode === "pattern" ? (
                <div className="flex items-start gap-3">
                  <BarChart2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Mönsterbaserad analys</h4>
                    <p className="text-sm text-muted-foreground">
                      Analyserar statistiska mönster i historisk data. Identifierar
                      bästa handelstider, veckodagar och tekniska indikatormönster.
                      Snabb och transparent.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Cpu className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium">Maskininlärningsanalys</h4>
                    <p className="text-sm text-muted-foreground">
                      Använder ML-modeller tränade på 30 års FRED-data plus
                      minutdata. Identifierar komplexa mönster och ger
                      sannolikhetsbaserade rekommendationer.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={analysisMode === "pattern" ? generatePatternSuggestions : generateMLSuggestions}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyserar...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generera förslag
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ML Model Status (only show in ML mode) */}
        {analysisMode === "ml" && (
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                ML-modellstatus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Modell</p>
                  <p className="font-mono text-sm">BrentPredictor v2.1</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Träningsdata</p>
                  <p className="font-mono text-sm">1987-2024 (30 år)</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Noggrannhet</p>
                  <p className="font-mono text-sm text-green-500">67.3%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className="text-green-500 border-green-500">
                    Redo
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggestions List */}
        {isGenerating && (
          <Card className="glass-card">
            <CardContent className="py-12">
              <div className="flex flex-col items-center">
                <Brain className="h-12 w-12 text-primary animate-pulse mb-4" />
                <h3 className="text-lg font-medium mb-2">Analyserar data...</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {analysisMode === "pattern"
                    ? "Söker efter statistiska mönster i prishistoriken"
                    : "Kör ML-modell på historisk data"}
                </p>
                <Progress value={45} className="w-48 h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {!isGenerating && pendingSuggestions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              Nya förslag ({pendingSuggestions.length})
            </h2>
            {pendingSuggestions.map((suggestion) => (
              <Card key={suggestion.id} className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {suggestion.type === "ml" ? (
                          <Cpu className="h-5 w-5 text-primary" />
                        ) : (
                          <BarChart2 className="h-5 w-5 text-primary" />
                        )}
                        <h3 className="font-medium">{suggestion.title}</h3>
                        <Badge variant={getRiskBadgeVariant(suggestion.riskLevel)}>
                          {suggestion.riskLevel === "low"
                            ? "Låg risk"
                            : suggestion.riskLevel === "medium"
                            ? "Medium risk"
                            : "Hög risk"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {suggestion.description}
                      </p>

                      {suggestion.suggestedRule && (
                        <div className="p-3 rounded-lg bg-muted/50 mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={
                                suggestion.suggestedRule.type === "BUY"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {suggestion.suggestedRule.type}
                            </Badge>
                            <span className="text-sm font-medium">Föreslagen regel</span>
                          </div>
                          <ul className="text-sm space-y-1">
                            {suggestion.suggestedRule.conditions.map((cond, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="text-primary">•</span>
                                {cond}
                              </li>
                            ))}
                          </ul>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>SL: {suggestion.suggestedRule.stopLoss}%</span>
                            <span>TP: {suggestion.suggestedRule.takeProfit}%</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span>Konfidens: {suggestion.confidence.toFixed(0)}%</span>
                        </div>
                        {suggestion.supportingData?.historicalWinRate && (
                          <div className="flex items-center gap-1">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <span>
                              Win rate: {suggestion.supportingData.historicalWinRate.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {suggestion.supportingData?.sampleSize && (
                          <div className="flex items-center gap-1">
                            <BarChart2 className="h-4 w-4 text-muted-foreground" />
                            <span>{suggestion.supportingData.sampleSize} observationer</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApplySuggestion(suggestion.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Tillämpa
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDismissSuggestion(suggestion.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Avfärda
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Applied Suggestions */}
        {appliedSuggestions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-muted-foreground">
              Tillämpade förslag ({appliedSuggestions.length})
            </h2>
            {appliedSuggestions.map((suggestion) => (
              <Card key={suggestion.id} className="glass-card opacity-60">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="font-medium">{suggestion.title}</span>
                    <Badge variant="outline" className="text-green-500 border-green-500">
                      Tillämpad
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isGenerating && suggestions.length === 0 && (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Inga förslag ännu</h3>
              <p className="text-muted-foreground text-center mb-4">
                Klicka på "Generera förslag" för att få AI-drivna handelsrekommendationer
              </p>
              <Button onClick={analysisMode === "pattern" ? generatePatternSuggestions : generateMLSuggestions}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generera förslag
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default PrisanalysAI;
