import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCreateRule } from "@/hooks/useTradingRules";
import { supabase } from "@/integrations/supabase/client";
import {
  Brain,
  Lightbulb,
  TrendingUp,
  CheckCircle2,
  Plus,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { RuleCondition, ActionConfig } from "@/hooks/useTradingRules";

interface SuggestedRule {
  name: string;
  description: string;
  rule_type: "BUY" | "SELL";
  conditions: RuleCondition[];
  estimated_improvement_percent: number;
  reasoning: string;
}

interface AnalysisResult {
  analysis: string;
  keyInsights: string[];
  suggestedRules: SuggestedRule[];
}

interface PaperTradeAnalysisProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaperTradeAnalysis({ open, onOpenChange }: PaperTradeAnalysisProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createRule = useCreateRule();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [addedRules, setAddedRules] = useState<Set<string>>(new Set());

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("analyze-paper-trades", {
        body: { userId: user.id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data as AnalysisResult;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
    },
    onError: (error) => {
      toast({
        title: "Analysfel",
        description: error instanceof Error ? error.message : "Kunde inte analysera trades",
        variant: "destructive",
      });
    },
  });

  const handleAddRule = async (rule: SuggestedRule) => {
    try {
      const defaultActionConfig: ActionConfig = {
        instrument: rule.rule_type === "BUY" ? "BULL" : "BEAR",
        amount_type: "SEK",
        amount: 1000,
      };

      await createRule.mutateAsync({
        name: rule.name,
        description: `${rule.description}\n\nFörväntad förbättring: +${rule.estimated_improvement_percent}%\n\nAI-analys: ${rule.reasoning}`,
        rule_type: rule.rule_type,
        conditions: rule.conditions,
        logic_operator: "AND",
        action_config: defaultActionConfig,
        stop_loss_percent: 2,
        take_profit_percent: rule.estimated_improvement_percent > 0 ? rule.estimated_improvement_percent : 1,
      });

      setAddedRules(prev => new Set(prev).add(rule.name));
      
      toast({
        title: "Regel tillagd",
        description: `"${rule.name}" har lagts till bland dina regler`,
      });

      queryClient.invalidateQueries({ queryKey: ["trading-rules"] });
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte lägga till regeln",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setAnalysisResult(null);
    setAddedRules(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI-Analys av Paper Trading
          </DialogTitle>
          <DialogDescription>
            Analysera dina paper trades och få förslag på regler som kan förbättra ditt resultat
          </DialogDescription>
        </DialogHeader>

        {!analysisResult && !analyzeMutation.isPending && (
          <div className="py-8 text-center">
            <Sparkles className="h-16 w-16 mx-auto mb-4 text-primary/50" />
            <p className="text-muted-foreground mb-6">
              Klicka på knappen nedan för att analysera dina paper trades med AI
            </p>
            <Button onClick={() => analyzeMutation.mutate()} size="lg" className="gap-2">
              <Brain className="h-4 w-4" />
              Starta Analys
            </Button>
          </div>
        )}

        {analyzeMutation.isPending && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <p className="text-muted-foreground">Analyserar dina trades...</p>
          </div>
        )}

        {analysisResult && (
          <div className="space-y-6">
            {/* Analysis Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Sammanfattning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">{analysisResult.analysis}</p>
              </CardContent>
            </Card>

            {/* Key Insights */}
            {analysisResult.keyInsights && analysisResult.keyInsights.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Viktiga Insikter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisResult.keyInsights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Suggested Rules */}
            {analysisResult.suggestedRules && analysisResult.suggestedRules.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Föreslagna Regler
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysisResult.suggestedRules.map((rule, i) => (
                    <div 
                      key={i} 
                      className="p-4 rounded-lg border border-border bg-card/50 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{rule.name}</h4>
                            <Badge variant="outline" className={
                              rule.rule_type === "BUY" 
                                ? "border-bullish text-bullish" 
                                : "border-bearish text-bearish"
                            }>
                              {rule.rule_type}
                            </Badge>
                            <Badge variant="secondary" className="text-bullish">
                              +{rule.estimated_improvement_percent}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={addedRules.has(rule.name) ? "secondary" : "default"}
                          disabled={addedRules.has(rule.name) || createRule.isPending}
                          onClick={() => handleAddRule(rule)}
                          className="gap-1"
                        >
                          {addedRules.has(rule.name) ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Tillagd
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              Lägg till
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        {rule.reasoning}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Stäng
              </Button>
              <Button onClick={() => analyzeMutation.mutate()} variant="secondary" className="gap-2">
                <Brain className="h-4 w-4" />
                Analysera igen
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
