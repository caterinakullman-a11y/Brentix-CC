import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Sparkles, AlertCircle, Loader2, BarChart3, List } from "lucide-react";
import { useTradingRules, TradingRule } from "@/hooks/useTradingRules";
import { useRecycleXRules, useRecycleXSuggestions } from "@/hooks/useRecycleX";
import { useAddPredefinedRules } from "@/hooks/useBacktest";
import { RuleCard } from "@/components/rules/RuleCard";
import { RecycleXRuleCard } from "@/components/recyclex/RecycleXRuleCard";
import { RuleBuilderModal } from "@/components/rules/RuleBuilderModal";
import { RuleAnalysisPanel } from "@/components/rules/RuleAnalysisPanel";
import type { RecycleXRule } from "@/types/recyclex";
import { toast } from "sonner";

export default function Rules() {
  const { data: tradingRules, isLoading: isLoadingTrading, error: tradingError } = useTradingRules();
  const { data: recycleXRules, isLoading: isLoadingRecycleX, error: recycleXError } = useRecycleXRules();
  const { data: suggestions } = useRecycleXSuggestions();
  const addPredefinedRules = useAddPredefinedRules();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TradingRule | null>(null);
  const [editingRecycleXRule, setEditingRecycleXRule] = useState<RecycleXRule | null>(null);

  const isLoading = isLoadingTrading || isLoadingRecycleX;
  const error = tradingError || recycleXError;

  const handleAddPredefined = async () => {
    try {
      await addPredefinedRules.mutateAsync();
      toast.success("6 fördefinierade regler tillagda");
    } catch {
      toast.error("Kunde inte lägga till fördefinierade regler");
    }
  };

  const handleEdit = (rule: TradingRule) => {
    setEditingRule(rule);
    setEditingRecycleXRule(null);
    setIsModalOpen(true);
  };

  const handleEditRecycleX = (rule: RecycleXRule) => {
    setEditingRecycleXRule(rule);
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setEditingRule(null);
      setEditingRecycleXRule(null);
    }
  };

  // Separate trading rules by active status
  const activeTrading = tradingRules?.filter((r) => r.is_active) || [];
  const inactiveTrading = tradingRules?.filter((r) => !r.is_active) || [];

  // Separate RecycleX rules by status
  const activeRecycleX = recycleXRules?.filter((r) =>
    r.status === 'ACTIVE' || r.status === 'WAITING'
  ) || [];
  const inactiveRecycleX = recycleXRules?.filter((r) =>
    r.status === 'INACTIVE' || r.status === 'PAUSED' || r.status === 'STOPPED' || r.status === 'COMPLETED'
  ) || [];

  const totalActive = activeTrading.length + activeRecycleX.length;
  const totalInactive = inactiveTrading.length + inactiveRecycleX.length;
  const totalRules = (tradingRules?.length || 0) + (recycleXRules?.length || 0);

  // Pending suggestions count
  const pendingSuggestions = suggestions?.filter(s => !s.dismissed) || [];

  return (
    <MainLayout>
      <Helmet>
        <title>Regler - BRENTIX</title>
        <meta name="description" content="Skapa och hantera dina handelsregler" />
      </Helmet>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Handelsregler</h1>
            <p className="text-muted-foreground text-sm">
              Skapa IF-THEN regler eller RecycleX-strategier för automatiserad handel
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleAddPredefined}
              disabled={addPredefinedRules.isPending}
            >
              {addPredefinedRules.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Fördefinierade regler
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ny regel
            </Button>
          </div>
        </div>

        {/* Tabs for Rules vs Analysis */}
        <Tabs defaultValue="rules" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Mina regler
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analys & Rekommendationer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-6">
            {/* Error State */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>Kunde inte ladda regler</span>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            )}

            {/* Pending Suggestions Banner */}
            {pendingSuggestions.length > 0 && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary">
                  Du har {pendingSuggestions.length} förslag på RecycleX-regler.
                  Klicka "Ny regel" och välj RecycleX för att se dem.
                </p>
              </div>
            )}

            {/* Rules List */}
            {!isLoading && !error && (
              <div className="space-y-6">
                {/* Active Rules */}
                {totalActive > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#5B9A6F]" />
                      Aktiva regler ({totalActive})
                    </h2>
                    <div className="space-y-3">
                      {activeTrading.map((rule) => (
                        <RuleCard key={rule.id} rule={rule} onEdit={handleEdit} />
                      ))}
                      {activeRecycleX.map((rule) => (
                        <RecycleXRuleCard key={rule.id} rule={rule} onEdit={handleEditRecycleX} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Inactive Rules */}
                {totalInactive > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                      Pausade/Inaktiva regler ({totalInactive})
                    </h2>
                    <div className="space-y-3">
                      {inactiveTrading.map((rule) => (
                        <RuleCard key={rule.id} rule={rule} onEdit={handleEdit} />
                      ))}
                      {inactiveRecycleX.map((rule) => (
                        <RecycleXRuleCard key={rule.id} rule={rule} onEdit={handleEditRecycleX} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {totalRules === 0 && (
                  <div className="text-center py-12">
                    <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Inga regler ännu
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Skapa din första handelsregel för att automatisera din trading
                    </p>
                    <Button onClick={() => setIsModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Skapa första regeln
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analysis">
            <RuleAnalysisPanel />
          </TabsContent>
        </Tabs>

        {/* Rule Builder Modal */}
        <RuleBuilderModal
          open={isModalOpen}
          onOpenChange={handleCloseModal}
          editRule={editingRule}
          editRecycleXRule={editingRecycleXRule}
        />
      </div>
    </MainLayout>
  );
}
