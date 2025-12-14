import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRulePerformance, useRuleRecommendations } from "@/hooks/useRuleAnalysis";
import { TrendingUp, Lightbulb, Check, X, ArrowRight, Trophy, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export function RuleInsightsWidget() {
  const navigate = useNavigate();
  const { bestRule, isLoading: rulesLoading } = useRulePerformance();
  const { recommendations, isLoading: recsLoading, acceptRecommendation, rejectRecommendation, isAccepting } = useRuleRecommendations();

  const isLoading = rulesLoading || recsLoading;
  const topRecommendation = recommendations?.[0];

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Regelinsikter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = bestRule || topRecommendation;

  if (!hasData) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Regelinsikter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            <p>Ingen data ännu.</p>
            <p className="mt-1">Genomför trades för att samla in statistik.</p>
            <Button 
              variant="link" 
              size="sm" 
              className="mt-2 text-primary"
              onClick={() => navigate("/rules")}
            >
              Gå till Regler <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Regelinsikter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Best performing rule */}
        {bestRule && (
          <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Bästa regel</span>
              </div>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                #{bestRule.performanceScore}
              </Badge>
            </div>
            <p className="text-sm font-medium mt-2 truncate">{bestRule.ruleName}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className={bestRule.winRate >= 50 ? "text-bullish" : "text-bearish"}>
                {bestRule.winRate.toFixed(0)}% vinst
              </span>
              <span>•</span>
              <span>{bestRule.totalTrades} trades</span>
              <span>•</span>
              <span className={bestRule.totalProfitLoss >= 0 ? "text-bullish" : "text-bearish"}>
                {bestRule.totalProfitLoss >= 0 ? "+" : ""}{bestRule.totalProfitLoss.toFixed(0)} SEK
              </span>
            </div>
          </div>
        )}

        {/* Top recommendation */}
        {topRecommendation && (
          <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/10">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Rekommendation</span>
              </div>
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                {topRecommendation.confidenceScore}% säker
              </Badge>
            </div>
            <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
              {topRecommendation.reasoning}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs gap-1"
                onClick={() => acceptRecommendation(topRecommendation.id)}
                disabled={isAccepting}
              >
                <Check className="h-3 w-3" />
                Tillämpa
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => rejectRecommendation({ id: topRecommendation.id })}
              >
                <X className="h-3 w-3" />
                Avvisa
              </Button>
            </div>
          </div>
        )}

        {/* Link to full analysis */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/rules?tab=analysis")}
        >
          Visa fullständig analys <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
