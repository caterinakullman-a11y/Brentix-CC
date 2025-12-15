import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTradingRules } from "@/hooks/useTradingRules";
import {
  Plus,
  Zap,
  Trash2,
  Edit,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Condition {
  id: string;
  type: string;
  operator?: string;
  value?: number;
  value2?: number;
  days?: number[];
  startHour?: number;
  endHour?: number;
}

const conditionTypes = [
  { value: "price_change", label: "Prisförändring", icon: TrendingUp },
  { value: "rsi", label: "RSI", icon: Activity },
  { value: "macd", label: "MACD", icon: Activity },
  { value: "time_range", label: "Tidsintervall", icon: Clock },
  { value: "day_of_week", label: "Veckodag", icon: Calendar },
  { value: "volume", label: "Volym", icon: Activity },
];

const dayNames = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];

const ConditionEditor = ({
  condition,
  onChange,
  onRemove,
}: {
  condition: Condition;
  onChange: (condition: Condition) => void;
  onRemove: () => void;
}) => {
  const typeInfo = conditionTypes.find((t) => t.value === condition.type);
  const Icon = typeInfo?.icon ?? Activity;

  return (
    <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{typeInfo?.label}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {condition.type === "price_change" && (
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={condition.operator ?? "gt"}
            onValueChange={(v) => onChange({ ...condition, operator: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gt">Större än</SelectItem>
              <SelectItem value="lt">Mindre än</SelectItem>
              <SelectItem value="eq">Lika med</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            step="0.1"
            placeholder="Värde %"
            value={condition.value ?? ""}
            onChange={(e) =>
              onChange({ ...condition, value: parseFloat(e.target.value) || 0 })
            }
          />
          <span className="text-sm text-muted-foreground flex items-center">%</span>
        </div>
      )}

      {condition.type === "rsi" && (
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={condition.operator ?? "lt"}
            onValueChange={(v) => onChange({ ...condition, operator: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lt">Under</SelectItem>
              <SelectItem value="gt">Över</SelectItem>
              <SelectItem value="between">Mellan</SelectItem>
              <SelectItem value="crosses_above">Korsar uppåt</SelectItem>
              <SelectItem value="crosses_below">Korsar nedåt</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Värde"
            value={condition.value ?? ""}
            onChange={(e) =>
              onChange({ ...condition, value: parseFloat(e.target.value) || 0 })
            }
          />
          {condition.operator === "between" && (
            <Input
              type="number"
              placeholder="Till"
              value={condition.value2 ?? ""}
              onChange={(e) =>
                onChange({ ...condition, value2: parseFloat(e.target.value) || 0 })
              }
            />
          )}
        </div>
      )}

      {condition.type === "macd" && (
        <Select
          value={condition.operator ?? "bullish_cross"}
          onValueChange={(v) => onChange({ ...condition, operator: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bullish_cross">Positiv korsning (Golden Cross)</SelectItem>
            <SelectItem value="bearish_cross">Negativ korsning (Death Cross)</SelectItem>
            <SelectItem value="histogram_positive">Histogram positivt</SelectItem>
            <SelectItem value="histogram_negative">Histogram negativt</SelectItem>
          </SelectContent>
        </Select>
      )}

      {condition.type === "time_range" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Från</Label>
            <Select
              value={condition.startHour?.toString() ?? "8"}
              onValueChange={(v) => onChange({ ...condition, startHour: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {i.toString().padStart(2, "0")}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Till</Label>
            <Select
              value={condition.endHour?.toString() ?? "18"}
              onValueChange={(v) => onChange({ ...condition, endHour: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {i.toString().padStart(2, "0")}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {condition.type === "day_of_week" && (
        <div className="flex flex-wrap gap-2">
          {dayNames.map((day, index) => (
            <Button
              key={index}
              variant={condition.days?.includes(index) ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const days = condition.days ?? [];
                const newDays = days.includes(index)
                  ? days.filter((d) => d !== index)
                  : [...days, index];
                onChange({ ...condition, days: newDays });
              }}
            >
              {day}
            </Button>
          ))}
        </div>
      )}

      {condition.type === "volume" && (
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={condition.operator ?? "gt"}
            onValueChange={(v) => onChange({ ...condition, operator: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gt">Större än genomsnitt x</SelectItem>
              <SelectItem value="lt">Mindre än genomsnitt x</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            step="0.1"
            placeholder="Multiplikator"
            value={condition.value ?? 1}
            onChange={(e) =>
              onChange({ ...condition, value: parseFloat(e.target.value) || 1 })
            }
          />
        </div>
      )}
    </div>
  );
};

const PrisanalysRegler = () => {
  const { rules, isLoading, createRule, updateRule, deleteRule, toggleRule } = useTradingRules();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);

  // New rule form state
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleType, setRuleType] = useState<"BUY" | "SELL">("BUY");
  const [logicOperator, setLogicOperator] = useState<"AND" | "OR">("AND");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [stopLoss, setStopLoss] = useState(2);
  const [takeProfit, setTakeProfit] = useState(3);

  const resetForm = () => {
    setRuleName("");
    setRuleDescription("");
    setRuleType("BUY");
    setLogicOperator("AND");
    setConditions([]);
    setStopLoss(2);
    setTakeProfit(3);
    setEditingRule(null);
  };

  const addCondition = (type: string) => {
    const newCondition: Condition = {
      id: crypto.randomUUID(),
      type,
    };
    setConditions([...conditions, newCondition]);
  };

  const updateCondition = (id: string, updated: Condition) => {
    setConditions(conditions.map((c) => (c.id === id ? updated : c)));
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const handleSaveRule = async () => {
    if (!ruleName.trim()) {
      toast.error("Ange ett namn för regeln");
      return;
    }

    if (conditions.length === 0) {
      toast.error("Lägg till minst ett villkor");
      return;
    }

    try {
      const ruleData = {
        name: ruleName,
        description: ruleDescription,
        rule_type: ruleType,
        logic_operator: logicOperator,
        conditions: conditions.map((c) => ({
          type: c.type,
          operator: c.operator,
          value: c.value,
          value2: c.value2,
          days: c.days,
          start_hour: c.startHour,
          end_hour: c.endHour,
        })),
        stop_loss_percent: stopLoss,
        take_profit_percent: takeProfit,
        action_config: { type: ruleType },
      };

      if (editingRule) {
        await updateRule({ id: editingRule, ...ruleData });
        toast.success("Regel uppdaterad");
      } else {
        await createRule(ruleData);
        toast.success("Regel skapad");
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Kunde inte spara regeln");
    }
  };

  const handleEditRule = (rule: {
    id: string;
    name: string;
    description?: string | null;
    rule_type: "BUY" | "SELL";
    logic_operator: "AND" | "OR";
    stop_loss_percent?: number | null;
    take_profit_percent?: number | null;
    conditions?: {
      type: string;
      operator?: string;
      value?: number;
      value2?: number;
      days?: number[];
      start_hour?: number;
      end_hour?: number;
    }[];
  }) => {
    setEditingRule(rule.id);
    setRuleName(rule.name);
    setRuleDescription(rule.description ?? "");
    setRuleType(rule.rule_type);
    setLogicOperator(rule.logic_operator);
    setStopLoss(rule.stop_loss_percent ?? 2);
    setTakeProfit(rule.take_profit_percent ?? 3);

    // Parse conditions
    const parsedConditions = (rule.conditions ?? []).map((c) => ({
      id: crypto.randomUUID(),
      type: c.type,
      operator: c.operator,
      value: c.value,
      value2: c.value2,
      days: c.days,
      startHour: c.start_hour,
      endHour: c.end_hour,
    }));
    setConditions(parsedConditions);
    setIsDialogOpen(true);
  };

  const handleDeleteRule = async (id: string) => {
    if (confirm("Är du säker på att du vill ta bort denna regel?")) {
      try {
        await deleteRule(id);
        toast.success("Regel borttagen");
      } catch (error) {
        toast.error("Kunde inte ta bort regeln");
      }
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Handelsregler</h1>
            <p className="text-sm text-muted-foreground">
              Skapa och hantera automatiska handelsregler
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ny regel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? "Redigera regel" : "Skapa ny regel"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="ruleName">Namn</Label>
                    <Input
                      id="ruleName"
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      placeholder="T.ex. Morgonköp på RSI"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="ruleDescription">Beskrivning (valfritt)</Label>
                    <Textarea
                      id="ruleDescription"
                      value={ruleDescription}
                      onChange={(e) => setRuleDescription(e.target.value)}
                      placeholder="Beskriv vad regeln gör..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Rule Type & Logic */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Typ</Label>
                    <Select value={ruleType} onValueChange={(v) => setRuleType(v as "BUY" | "SELL")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUY">
                          <span className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            KÖP
                          </span>
                        </SelectItem>
                        <SelectItem value="SELL">
                          <span className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            SÄLJ
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Logik mellan villkor</Label>
                    <Select value={logicOperator} onValueChange={(v) => setLogicOperator(v as "AND" | "OR")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">ALLA villkor (OCH)</SelectItem>
                        <SelectItem value="OR">NÅGOT villkor (ELLER)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Conditions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Villkor</Label>
                    <Select onValueChange={(v) => addCondition(v)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Lägg till villkor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {conditionTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <span className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {conditions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                      Inga villkor tillagda. Lägg till villkor ovan.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conditions.map((condition, index) => (
                        <div key={condition.id}>
                          <ConditionEditor
                            condition={condition}
                            onChange={(updated) => updateCondition(condition.id, updated)}
                            onRemove={() => removeCondition(condition.id)}
                          />
                          {index < conditions.length - 1 && (
                            <div className="flex items-center justify-center py-2">
                              <Badge variant="outline">{logicOperator}</Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Risk Management */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                    <Input
                      id="stopLoss"
                      type="number"
                      step="0.5"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="takeProfit">Take Profit (%)</Label>
                    <Input
                      id="takeProfit"
                      type="number"
                      step="0.5"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Avbryt
                  </Button>
                  <Button onClick={handleSaveRule}>
                    {editingRule ? "Uppdatera" : "Skapa regel"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Rules List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Zap className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Inga regler</h3>
              <p className="text-muted-foreground text-center mb-4">
                Skapa din första handelsregel för att börja automatisera
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Skapa regel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <Card key={rule.id} className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={rule.rule_type === "BUY" ? "default" : "destructive"}
                        >
                          {rule.rule_type}
                        </Badge>
                        <h3 className="text-lg font-medium">{rule.name}</h3>
                        {rule.is_active && (
                          <Badge variant="outline" className="text-green-500 border-green-500">
                            Aktiv
                          </Badge>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {rule.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(rule.conditions as { type: string }[])?.map((c, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {conditionTypes.find((t) => t.value === c.type)?.label ?? c.type}
                          </Badge>
                        ))}
                        <Badge variant="outline" className="text-xs">
                          {rule.logic_operator}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>SL: {rule.stop_loss_percent ?? 0}%</span>
                        <span>TP: {rule.take_profit_percent ?? 0}%</span>
                        <span>Triggar: {rule.trigger_count ?? 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => toggleRule(rule.id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditRule(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a href={`/prisanalys/backtest?rule=${rule.id}`}>
                          <PlayCircle className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PrisanalysRegler;
