import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import {
  TradingRule,
  RuleCondition,
  CreateRuleInput,
  useCreateRule,
  useUpdateRule,
} from "@/hooks/useTradingRules";
import { toast } from "sonner";

interface RuleBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRule?: TradingRule | null;
}

const defaultCondition: RuleCondition = {
  type: "price_change",
  direction: "up",
  min_percent: 0.2,
  duration_seconds: 60,
};

export function RuleBuilderModal({
  open,
  onOpenChange,
  editRule,
}: RuleBuilderModalProps) {
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ruleType, setRuleType] = useState<"BUY" | "SELL" | "BOTH">("BUY");
  const [conditions, setConditions] = useState<RuleCondition[]>([defaultCondition]);
  const [logicOperator, setLogicOperator] = useState<"AND" | "OR">("AND");
  const [instrument, setInstrument] = useState<"BULL" | "BEAR">("BULL");
  const [amount, setAmount] = useState(1000);
  const [stopLoss, setStopLoss] = useState<number | undefined>(5);
  const [takeProfit, setTakeProfit] = useState<number | undefined>(3);
  const [trailingStop, setTrailingStop] = useState(false);

  useEffect(() => {
    if (editRule) {
      setName(editRule.name);
      setDescription(editRule.description || "");
      setRuleType(editRule.rule_type);
      setConditions(editRule.conditions);
      setLogicOperator(editRule.logic_operator);
      setInstrument(editRule.action_config.instrument as "BULL" | "BEAR");
      setAmount(editRule.action_config.amount);
      setStopLoss(editRule.stop_loss_percent ?? undefined);
      setTakeProfit(editRule.take_profit_percent ?? undefined);
      setTrailingStop(editRule.trailing_stop);
    } else {
      resetForm();
    }
  }, [editRule, open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setRuleType("BUY");
    setConditions([defaultCondition]);
    setLogicOperator("AND");
    setInstrument("BULL");
    setAmount(1000);
    setStopLoss(5);
    setTakeProfit(3);
    setTrailingStop(false);
  };

  const addCondition = () => {
    setConditions([...conditions, { ...defaultCondition }]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    setConditions(
      conditions.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Ange ett namn för regeln");
      return;
    }

    const input: CreateRuleInput = {
      name,
      description: description || undefined,
      rule_type: ruleType,
      conditions,
      logic_operator: logicOperator,
      action_config: {
        instrument,
        amount_type: "SEK",
        amount,
      },
      stop_loss_percent: stopLoss,
      take_profit_percent: takeProfit,
      trailing_stop: trailingStop,
    };

    try {
      if (editRule) {
        await updateRule.mutateAsync({
          id: editRule.id,
          ...input,
        });
        toast.success("Regel uppdaterad");
      } else {
        await createRule.mutateAsync(input);
        toast.success("Regel skapad");
      }
      onOpenChange(false);
    } catch {
      toast.error("Kunde inte spara regel");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editRule ? "Redigera regel" : "Ny handelsregel"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name and Description */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Namn</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Min handelsregel"
              />
            </div>
            <div>
              <Label htmlFor="description">Beskrivning (valfritt)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beskriv vad regeln gör..."
                rows={2}
              />
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">OM:</Label>
              <Button variant="outline" size="sm" onClick={addCondition}>
                <Plus className="h-4 w-4 mr-1" /> Lägg till villkor
              </Button>
            </div>

            {conditions.map((condition, index) => (
              <div key={index} className="space-y-2">
                {index > 0 && (
                  <Select
                    value={logicOperator}
                    onValueChange={(v) => setLogicOperator(v as "AND" | "OR")}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">OCH</SelectItem>
                      <SelectItem value="OR">ELLER</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Select
                    value={condition.type}
                    onValueChange={(v) =>
                      updateCondition(index, { type: v as RuleCondition["type"] })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price_change">Pris</SelectItem>
                      <SelectItem value="rsi">RSI</SelectItem>
                      <SelectItem value="macd">MACD</SelectItem>
                    </SelectContent>
                  </Select>

                  {condition.type === "price_change" && (
                    <>
                      <Select
                        value={condition.direction}
                        onValueChange={(v) =>
                          updateCondition(index, { direction: v as "up" | "down" | "any" })
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="up">stiger</SelectItem>
                          <SelectItem value="down">faller</SelectItem>
                          <SelectItem value="any">ändras</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">{">"}</span>
                      <Input
                        type="number"
                        step="0.1"
                        className="w-20"
                        value={condition.min_percent || ""}
                        onChange={(e) =>
                          updateCondition(index, {
                            min_percent: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <span className="text-muted-foreground">%</span>
                      <span className="text-muted-foreground">under</span>
                      <Input
                        type="number"
                        className="w-20"
                        value={condition.duration_seconds || ""}
                        onChange={(e) =>
                          updateCondition(index, {
                            duration_seconds: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                      <span className="text-muted-foreground">sek</span>
                    </>
                  )}

                  {condition.type === "rsi" && (
                    <>
                      <Select
                        value={condition.operator || "<"}
                        onValueChange={(v) =>
                          updateCondition(index, { operator: v as RuleCondition["operator"] })
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<">är under</SelectItem>
                          <SelectItem value=">">är över</SelectItem>
                          <SelectItem value="crosses_above">korsar uppåt</SelectItem>
                          <SelectItem value="crosses_below">korsar nedåt</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        className="w-20"
                        value={(condition.value as number) || ""}
                        onChange={(e) =>
                          updateCondition(index, {
                            value: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </>
                  )}

                  {condition.type === "macd" && (
                    <Select
                      value={condition.condition || "bullish_cross"}
                      onValueChange={(v) =>
                        updateCondition(index, { condition: v as RuleCondition["condition"] })
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bullish_cross">Bullish Cross</SelectItem>
                        <SelectItem value="bearish_cross">Bearish Cross</SelectItem>
                        <SelectItem value="histogram_positive">Histogram positiv</SelectItem>
                        <SelectItem value="histogram_negative">Histogram negativ</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {conditions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeCondition(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">DÅ:</Label>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Select
                value={ruleType}
                onValueChange={(v) => setRuleType(v as "BUY" | "SELL" | "BOTH")}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">KÖP</SelectItem>
                  <SelectItem value="SELL">SÄLJ</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={instrument}
                onValueChange={(v) => setInstrument(v as "BULL" | "BEAR")}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BULL">BULL</SelectItem>
                  <SelectItem value="BEAR">BEAR</SelectItem>
                </SelectContent>
              </Select>

              <span className="text-muted-foreground">för</span>
              <Input
                type="number"
                className="w-24"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              />
              <span className="text-muted-foreground">SEK</span>
            </div>
          </div>

          {/* Risk Management */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Riskhantering:</Label>
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">Stop-loss:</Label>
                <Input
                  type="number"
                  step="0.5"
                  className="w-20"
                  value={stopLoss || ""}
                  onChange={(e) =>
                    setStopLoss(parseFloat(e.target.value) || undefined)
                  }
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">Take-profit:</Label>
                <Input
                  type="number"
                  step="0.5"
                  className="w-20"
                  value={takeProfit || ""}
                  onChange={(e) =>
                    setTakeProfit(parseFloat(e.target.value) || undefined)
                  }
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Switch
                  checked={trailingStop}
                  onCheckedChange={setTrailingStop}
                  id="trailing-stop"
                />
                <Label htmlFor="trailing-stop">Trailing stop</Label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            onClick={handleSave}
            disabled={createRule.isPending || updateRule.isPending}
          >
            {editRule ? "Uppdatera" : "Spara"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
