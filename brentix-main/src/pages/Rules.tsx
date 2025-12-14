import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Sparkles, AlertCircle, Loader2, BarChart3, List } from "lucide-react";
import { useTradingRules, TradingRule } from "@/hooks/useTradingRules";
import { useAddPredefinedRules } from "@/hooks/useBacktest";
import { RuleCard } from "@/components/rules/RuleCard";
import { RuleBuilderModal } from "@/components/rules/RuleBuilderModal";
import { RuleAnalysisPanel } from "@/components/rules/RuleAnalysisPanel";
import { toast } from "sonner";

export default function Rules() {
  const { data: rules, isLoading, error } = useTradingRules();
  const addPredefinedRules = useAddPredefinedRules();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TradingRule | null>(null);

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
    setIsModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setEditingRule(null);
    }
  };

  const activeRules = rules?.filter((r) => r.is_active) || [];
  const inactiveRules = rules?.filter((r) => !r.is_active) || [];

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
              Skapa IF-THEN regler för automatiserad handel
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

            {/* Rules List */}
            {!isLoading && !error && (
              <div className="space-y-6">
                {/* Active Rules */}
                {activeRules.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#5B9A6F]" />
                      Aktiva regler ({activeRules.length})
                    </h2>
                    <div className="space-y-3">
                      {activeRules.map((rule) => (
                        <RuleCard key={rule.id} rule={rule} onEdit={handleEdit} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Inactive Rules */}
                {inactiveRules.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                      Pausade regler ({inactiveRules.length})
                    </h2>
                    <div className="space-y-3">
                      {inactiveRules.map((rule) => (
                        <RuleCard key={rule.id} rule={rule} onEdit={handleEdit} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {rules?.length === 0 && (
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
        />
      </div>
    </MainLayout>
  );
}
