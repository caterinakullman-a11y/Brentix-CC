import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Lightbulb, 
  RefreshCw, 
  Check, 
  X, 
  BarChart3, 
  Zap,
  Power,
  PowerOff,
  Layers
} from "lucide-react";
import { 
  useRulePerformance, 
  useRuleRecommendations,
  RulePerformance,
  CombinationPerformance,
  Recommendation 
} from "@/hooks/useRuleAnalysis";
import { cn } from "@/lib/utils";

function RecommendationCard({ 
  recommendation, 
  onAccept, 
  onReject,
  isAccepting 
}: { 
  recommendation: Recommendation;
  onAccept: () => void;
  onReject: () => void;
  isAccepting: boolean;
}) {
  const getTypeIcon = () => {
    switch (recommendation.type) {
      case "enable_rule": return <Power className="h-4 w-4 text-[#5B9A6F]" />;
      case "disable_rule": return <PowerOff className="h-4 w-4 text-[#9A5B5B]" />;
      case "try_combination": return <Layers className="h-4 w-4 text-amber-500" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getTypeLabel = () => {
    switch (recommendation.type) {
      case "enable_rule": return "Aktivera regel";
      case "disable_rule": return "Avaktivera regel";
      case "try_combination": return "Prova kombination";
      default: return "Förslag";
    }
  };

  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getTypeIcon()}
              <span className="font-medium text-sm">{getTypeLabel()}</span>
              <Badge variant="outline" className="text-xs">
                {recommendation.confidenceScore}% säkerhet
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {recommendation.reasoning}
            </p>
            
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>📊 {recommendation.supportingData.trades_analyzed} trades</span>
              <span>🎯 {recommendation.supportingData.win_rate?.toFixed(1)}% vinst</span>
              {recommendation.supportingData.profit_factor && (
                <span>📈 PF: {recommendation.supportingData.profit_factor.toFixed(2)}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={onReject}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button 
              size="sm"
              onClick={onAccept}
              disabled={isAccepting}
            >
              <Check className="h-4 w-4 mr-1" />
              Tillämpa
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RuleStatsCard({ rule }: { rule: RulePerformance }) {
  const isPositive = rule.totalProfitLoss >= 0;
  
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-sm">{rule.ruleName}</h4>
            <span className="text-xs text-muted-foreground">{rule.totalTrades} trades</span>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              isPositive ? "border-[#5B9A6F] text-[#5B9A6F]" : "border-[#9A5B5B] text-[#9A5B5B]"
            )}
          >
            {isPositive ? "+" : ""}{rule.totalProfitLoss.toFixed(0)} SEK
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">Score:</span>
          <Progress value={rule.performanceScore} className="h-2 flex-1" />
          <span className="text-xs font-mono">{rule.performanceScore}/100</span>
        </div>
        
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <div className={cn(
              "font-medium",
              rule.winRate >= 50 ? "text-[#5B9A6F]" : "text-[#9A5B5B]"
            )}>
              {rule.winRate.toFixed(1)}%
            </div>
            <div className="text-muted-foreground">Win Rate</div>
          </div>
          <div>
            <div className="font-medium">{rule.profitFactor.toFixed(2)}</div>
            <div className="text-muted-foreground">Profit Factor</div>
          </div>
          <div>
            <div className="font-medium text-[#5B9A6F]">+{rule.bestTrade.toFixed(0)}</div>
            <div className="text-muted-foreground">Bästa</div>
          </div>
          <div>
            <div className="font-medium text-[#9A5B5B]">{rule.worstTrade.toFixed(0)}</div>
            <div className="text-muted-foreground">Sämsta</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CombinationStatsCard({ combination, rank }: { combination: CombinationPerformance; rank: number }) {
  const isPositive = combination.improvementVsBaseline >= 0;
  
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">#{rank}</Badge>
            <span className="text-sm font-medium">
              {combination.ruleNames.slice(0, 3).join(" + ")}
              {combination.ruleNames.length > 3 && ` +${combination.ruleNames.length - 3}`}
            </span>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              isPositive ? "border-[#5B9A6F] text-[#5B9A6F]" : "border-[#9A5B5B] text-[#9A5B5B]"
            )}
          >
            {isPositive ? "+" : ""}{combination.improvementVsBaseline.toFixed(1)}% vs baseline
          </Badge>
        </div>
        
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <div className={cn(
              "font-medium",
              combination.winRate >= 50 ? "text-[#5B9A6F]" : "text-[#9A5B5B]"
            )}>
              {combination.winRate.toFixed(1)}%
            </div>
            <div className="text-muted-foreground">Win Rate</div>
          </div>
          <div>
            <div className="font-medium">{combination.profitFactor.toFixed(2)}</div>
            <div className="text-muted-foreground">Profit Factor</div>
          </div>
          <div>
            <div className="font-medium">{combination.totalTrades}</div>
            <div className="text-muted-foreground">Trades</div>
          </div>
          <div>
            <div className="font-medium">{combination.confidenceLevel.toFixed(0)}%</div>
            <div className="text-muted-foreground">Konfidens</div>
          </div>
        </div>
        
        {!combination.sampleSizeSufficient && (
          <p className="text-xs text-amber-500 mt-2">
            ⚠️ Behöver fler trades för tillförlitlig statistik
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function RuleAnalysisPanel() {
  const { ruleStats, combinationStats, bestRule, bestCombination, isLoading } = useRulePerformance();
  const { 
    recommendations, 
    acceptRecommendation, 
    rejectRecommendation, 
    refreshAnalysis, 
    isRefreshing,
    isAccepting 
  } = useRuleRecommendations();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const hasData = (ruleStats?.length || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Regelanalys</h2>
          <p className="text-sm text-muted-foreground">
            Analysera och optimera dina handelsregler
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refreshAnalysis()}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
          Uppdatera analys
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Bästa regel</span>
            </div>
            {bestRule ? (
              <>
                <div className="text-lg font-semibold truncate">{bestRule.ruleName}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={bestRule.winRate >= 50 ? "text-[#5B9A6F]" : "text-[#9A5B5B]"}>
                    {bestRule.winRate.toFixed(1)}% vinst
                  </span>
                  <span>•</span>
                  <span>{bestRule.totalTrades} trades</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Inte tillräckligt med data</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium">Bästa kombination</span>
            </div>
            {bestCombination ? (
              <>
                <div className="text-lg font-semibold truncate">
                  {bestCombination.ruleNames.length} regler
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={bestCombination.improvementVsBaseline >= 0 ? "text-[#5B9A6F]" : "text-[#9A5B5B]"}>
                    +{bestCombination.improvementVsBaseline.toFixed(1)}% vs baseline
                  </span>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Inte tillräckligt med data</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Rekommendationer</span>
            </div>
            <div className="text-lg font-semibold">{recommendations?.length || 0} förslag</div>
            <div className="text-xs text-muted-foreground">
              Baserat på din handelshistorik
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Rekommendationer
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Regler
          </TabsTrigger>
          <TabsTrigger value="combinations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Kombinationer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          {(recommendations?.length || 0) === 0 ? (
            <Card className="bg-card border-border/50">
              <CardContent className="py-12 text-center">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Inga rekommendationer just nu. Fortsätt handla så analyserar vi dina resultat!
                </p>
              </CardContent>
            </Card>
          ) : (
            recommendations?.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onAccept={() => acceptRecommendation(rec.id)}
                onReject={() => rejectRecommendation({ id: rec.id })}
                isAccepting={isAccepting}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          {(ruleStats?.length || 0) === 0 ? (
            <Card className="bg-card border-border/50">
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Ingen regelstatistik tillgänglig. Handla med aktiva regler för att samla data.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ruleStats?.map((rule) => (
                <RuleStatsCard key={rule.ruleId} rule={rule} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="combinations" className="space-y-4">
          {(combinationStats?.length || 0) === 0 ? (
            <Card className="bg-card border-border/50">
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Ingen kombinationsstatistik tillgänglig. Handla med flera aktiva regler för att samla data.
                </p>
              </CardContent>
            </Card>
          ) : (
            combinationStats?.map((combo, i) => (
              <CombinationStatsCard key={i} combination={combo} rank={i + 1} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}