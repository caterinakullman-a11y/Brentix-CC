import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Loader2 } from "lucide-react";
import {
  useCreateRecycleXRule,
  useUpdateRecycleXRule,
  useCreateCounterpartSuggestion,
} from "@/hooks/useRecycleX";
import type {
  RecycleXRule,
  RecycleXType,
  RecycleXStartMode,
  CapitalMode,
  CycleRestartMode,
} from "@/types/recyclex";
import { RECYCLEX_DEFAULTS, RECYCLEX_LIMITS } from "@/constants/recyclex";
import { toast } from "sonner";

interface RecycleXBuilderFormProps {
  type: RecycleXType;
  editRule?: RecycleXRule | null;
  onClose: () => void;
}

export function RecycleXBuilderForm({ type, editRule, onClose }: RecycleXBuilderFormProps) {
  const createRule = useCreateRecycleXRule();
  const updateRule = useUpdateRecycleXRule();
  const createSuggestion = useCreateCounterpartSuggestion();

  // Form state
  const [name, setName] = useState("");
  const [startMode, setStartMode] = useState<RecycleXStartMode>("MANUAL");
  const [autoStartPrice, setAutoStartPrice] = useState<number | undefined>();
  const [capital, setCapital] = useState(RECYCLEX_DEFAULTS.CAPITAL);
  const [targetPercent, setTargetPercent] = useState(RECYCLEX_DEFAULTS.TARGET_PERCENT);
  const [stopLossPercent, setStopLossPercent] = useState(RECYCLEX_DEFAULTS.STOP_LOSS_PERCENT);
  const [targetCycles, setTargetCycles] = useState(RECYCLEX_DEFAULTS.TARGET_CYCLES);

  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [orderCount, setOrderCount] = useState(RECYCLEX_DEFAULTS.ORDER_COUNT);
  const [orderSpread, setOrderSpread] = useState(RECYCLEX_DEFAULTS.ORDER_SPREAD);
  const [capitalMode, setCapitalMode] = useState<CapitalMode>("COMPOUND");
  const [cycleRestartMode, setCycleRestartMode] = useState<CycleRestartMode>("CURRENT_PRICE");
  const [feePerTrade, setFeePerTrade] = useState(RECYCLEX_DEFAULTS.FEE_PER_TRADE);
  const [feePercent, setFeePercent] = useState(RECYCLEX_DEFAULTS.FEE_PERCENT);
  const [closeBeforeMarketClose, setCloseBeforeMarketClose] = useState(false);
  const [closeBeforeMinutes, setCloseBeforeMinutes] = useState(RECYCLEX_DEFAULTS.CLOSE_BEFORE_MINUTES);

  // Populate form when editing
  useEffect(() => {
    if (editRule) {
      setName(editRule.name);
      setStartMode(editRule.start_mode);
      setAutoStartPrice(editRule.auto_start_price ?? undefined);
      setCapital(editRule.config.capital);
      setTargetPercent(editRule.config.targetPercent);
      setStopLossPercent(editRule.config.stopLossPercent);
      setTargetCycles(editRule.config.targetCycles);
      setOrderCount(editRule.config.orderCount);
      setOrderSpread(editRule.config.orderSpread);
      setCapitalMode(editRule.config.capitalMode);
      setCycleRestartMode(editRule.config.cycleRestartMode);
      setFeePerTrade(editRule.config.feePerTrade);
      setFeePercent(editRule.config.feePercent);
      setCloseBeforeMarketClose(editRule.config.closeBeforeMarketClose);
      setCloseBeforeMinutes(editRule.config.closeBeforeMinutes);
    } else {
      // Reset to defaults
      setName(`RecycleX ${type}`);
      setStartMode("MANUAL");
      setAutoStartPrice(undefined);
      setCapital(RECYCLEX_DEFAULTS.CAPITAL);
      setTargetPercent(RECYCLEX_DEFAULTS.TARGET_PERCENT);
      setStopLossPercent(RECYCLEX_DEFAULTS.STOP_LOSS_PERCENT);
      setTargetCycles(RECYCLEX_DEFAULTS.TARGET_CYCLES);
      setOrderCount(RECYCLEX_DEFAULTS.ORDER_COUNT);
      setOrderSpread(RECYCLEX_DEFAULTS.ORDER_SPREAD);
      setCapitalMode("COMPOUND");
      setCycleRestartMode("CURRENT_PRICE");
      setFeePerTrade(RECYCLEX_DEFAULTS.FEE_PER_TRADE);
      setFeePercent(RECYCLEX_DEFAULTS.FEE_PERCENT);
      setCloseBeforeMarketClose(false);
      setCloseBeforeMinutes(RECYCLEX_DEFAULTS.CLOSE_BEFORE_MINUTES);
    }
  }, [editRule, type]);

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("Ange ett namn för regeln");
      return;
    }
    if (capital < RECYCLEX_LIMITS.CAPITAL_MIN) {
      toast.error(`Kapital måste vara minst ${RECYCLEX_LIMITS.CAPITAL_MIN} SEK`);
      return;
    }
    if (startMode === "AUTO" && !autoStartPrice) {
      toast.error("Ange ett auto-startpris");
      return;
    }

    const config: import("@/types/recyclex").RecycleXConfig = {
      capital,
      targetPercent,
      stopLossPercent,
      targetCycles,
      orderCount,
      orderSpread,
      capitalMode,
      cycleRestartMode,
      cycleRestartTolerance: RECYCLEX_DEFAULTS.CYCLE_RESTART_TOLERANCE,
      feePerTrade,
      feePercent,
      maxCycleDuration: null,
      closeBeforeMarketClose,
      closeBeforeMinutes,
      referencePrice: 0,
    };

    try {
      if (editRule) {
        await updateRule.mutateAsync({
          id: editRule.id,
          name,
          auto_start_price: startMode === "AUTO" ? autoStartPrice : null,
          config,
        });
        toast.success("Regel uppdaterad");
      } else {
        const newRule = await createRule.mutateAsync({
          name,
          type,
          start_mode: startMode,
          auto_start_price: startMode === "AUTO" ? autoStartPrice : null,
          config,
        });

        // Create counterpart suggestion
        try {
          await createSuggestion.mutateAsync({
            ruleId: newRule.id,
            ruleType: type,
            config,
          });
        } catch {
          // Ignore suggestion creation errors
        }

        toast.success("Regel skapad");
      }
      onClose();
    } catch {
      toast.error("Kunde inte spara regel");
    }
  };

  const isPending = createRule.isPending || updateRule.isPending;

  return (
    <div className="space-y-6 py-4">
      {/* Name */}
      <div>
        <Label htmlFor="recyclex-name">Namn</Label>
        <Input
          id="recyclex-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`RecycleX ${type}`}
          maxLength={RECYCLEX_LIMITS.NAME_MAX_LENGTH}
        />
      </div>

      {/* Start Mode */}
      <div className="space-y-3">
        <Label>Startläge</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="startMode"
              value="MANUAL"
              checked={startMode === "MANUAL"}
              onChange={() => setStartMode("MANUAL")}
              className="w-4 h-4"
            />
            <span>Manuell start</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="startMode"
              value="AUTO"
              checked={startMode === "AUTO"}
              onChange={() => setStartMode("AUTO")}
              className="w-4 h-4"
            />
            <span>Automatisk start</span>
          </label>
        </div>

        {startMode === "AUTO" && (
          <div className="pl-6">
            <Label htmlFor="auto-start-price">Auto-startpris (SEK)</Label>
            <Input
              id="auto-start-price"
              type="number"
              step="0.01"
              value={autoStartPrice || ""}
              onChange={(e) => setAutoStartPrice(parseFloat(e.target.value) || undefined)}
              placeholder="T.ex. 1.75"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Regeln startar automatiskt när priset når denna nivå (±0.2%)
            </p>
          </div>
        )}
      </div>

      {/* Capital */}
      <div>
        <Label htmlFor="capital">Kapital (SEK)</Label>
        <Input
          id="capital"
          type="number"
          value={capital}
          onChange={(e) => setCapital(parseInt(e.target.value) || 0)}
          min={RECYCLEX_LIMITS.CAPITAL_MIN}
          max={RECYCLEX_LIMITS.CAPITAL_MAX}
        />
      </div>

      {/* Target Percent */}
      <div>
        <Label htmlFor="target-percent">Vinstmål (%)</Label>
        <Input
          id="target-percent"
          type="number"
          step="0.01"
          value={targetPercent}
          onChange={(e) => setTargetPercent(parseFloat(e.target.value) || 0)}
          min={RECYCLEX_LIMITS.TARGET_PERCENT_MIN}
          max={RECYCLEX_LIMITS.TARGET_PERCENT_MAX}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Standard: 25.71% (baserat på historisk volatilitet)
        </p>
      </div>

      {/* Stop Loss Percent */}
      <div>
        <Label htmlFor="stop-loss-percent">Stop-loss (%)</Label>
        <Input
          id="stop-loss-percent"
          type="number"
          step="0.1"
          value={stopLossPercent}
          onChange={(e) => setStopLossPercent(parseFloat(e.target.value) || 0)}
          min={RECYCLEX_LIMITS.STOP_LOSS_PERCENT_MIN}
          max={RECYCLEX_LIMITS.STOP_LOSS_PERCENT_MAX}
        />
      </div>

      {/* Target Cycles */}
      <div>
        <Label htmlFor="target-cycles">Antal cykler</Label>
        <Input
          id="target-cycles"
          type="number"
          value={targetCycles}
          onChange={(e) => setTargetCycles(parseInt(e.target.value) || 1)}
          min={RECYCLEX_LIMITS.TARGET_CYCLES_MIN}
          max={RECYCLEX_LIMITS.TARGET_CYCLES_MAX}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Standard: 28 cykler (ca 1 månad)
        </p>
      </div>

      {/* Advanced Options */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span>Avancerade inställningar</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Order Count & Spread */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="order-count">Antal ordrar</Label>
              <Input
                id="order-count"
                type="number"
                value={orderCount}
                onChange={(e) => setOrderCount(parseInt(e.target.value) || 1)}
                min={RECYCLEX_LIMITS.ORDER_COUNT_MIN}
                max={RECYCLEX_LIMITS.ORDER_COUNT_MAX}
              />
            </div>
            <div>
              <Label htmlFor="order-spread">Order-spread (%)</Label>
              <Input
                id="order-spread"
                type="number"
                step="0.1"
                value={orderSpread}
                onChange={(e) => setOrderSpread(parseFloat(e.target.value) || 0)}
                min={RECYCLEX_LIMITS.ORDER_SPREAD_MIN}
                max={RECYCLEX_LIMITS.ORDER_SPREAD_MAX}
              />
            </div>
          </div>

          {/* Capital Mode */}
          <div>
            <Label htmlFor="capital-mode">Kapitalläge</Label>
            <Select value={capitalMode} onValueChange={(v) => setCapitalMode(v as CapitalMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPOUND">Ackumulerande (rulla vinster)</SelectItem>
                <SelectItem value="FIXED">Fast kapital varje cykel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cycle Restart Mode */}
          <div>
            <Label htmlFor="cycle-restart-mode">Cykelåterstart</Label>
            <Select value={cycleRestartMode} onValueChange={(v) => setCycleRestartMode(v as CycleRestartMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CURRENT_PRICE">Starta direkt med aktuellt pris</SelectItem>
                <SelectItem value="WAIT_FOR_REFERENCE">Vänta på referenspris</SelectItem>
                <SelectItem value="ADJUSTED">Använd föregående target som nytt ref.</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fees */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fee-per-trade">Avgift per trade (SEK)</Label>
              <Input
                id="fee-per-trade"
                type="number"
                value={feePerTrade}
                onChange={(e) => setFeePerTrade(parseFloat(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div>
              <Label htmlFor="fee-percent">Avgift (%)</Label>
              <Input
                id="fee-percent"
                type="number"
                step="0.01"
                value={feePercent}
                onChange={(e) => setFeePercent(parseFloat(e.target.value) || 0)}
                min={0}
                max={RECYCLEX_LIMITS.FEE_PERCENT_MAX}
              />
            </div>
          </div>

          {/* Market Close */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="close-before-market">Stäng innan marknad stänger</Label>
              <p className="text-xs text-muted-foreground">
                Stänger positioner automatiskt före marknadens stängning
              </p>
            </div>
            <Switch
              id="close-before-market"
              checked={closeBeforeMarketClose}
              onCheckedChange={setCloseBeforeMarketClose}
            />
          </div>

          {closeBeforeMarketClose && (
            <div>
              <Label htmlFor="close-before-minutes">Minuter före stängning</Label>
              <Input
                id="close-before-minutes"
                type="number"
                value={closeBeforeMinutes}
                onChange={(e) => setCloseBeforeMinutes(parseInt(e.target.value) || 15)}
                min={RECYCLEX_LIMITS.CLOSE_BEFORE_MINUTES_MIN}
                max={RECYCLEX_LIMITS.CLOSE_BEFORE_MINUTES_MAX}
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Avbryt
        </Button>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Sparar...
            </>
          ) : editRule ? (
            "Uppdatera"
          ) : (
            "Skapa"
          )}
        </Button>
      </div>
    </div>
  );
}
