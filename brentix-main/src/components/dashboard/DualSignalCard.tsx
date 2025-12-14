import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Zap, Settings2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useActiveSignal } from "@/hooks/useSignals";
import { usePriceData } from "@/hooks/usePriceData";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { AdjustablePrice } from "./AdjustablePrice";
import { InstrumentSelector } from "@/components/settings/InstrumentSelector";
import { toast } from "@/hooks/use-toast";
import { OIL_INSTRUMENTS, DEFAULT_BULL_ID, DEFAULT_BEAR_ID, findMatchingPair, type Instrument } from "@/constants/instruments";

interface SignalData {
  type: "BUY" | "SELL" | "HOLD";
  strength: "STRONG" | "MODERATE" | "WEAK";
  confidence: number;
  probabilityUp: number;
  probabilityDown: number;
  currentPrice: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  reasoning: string;
}

interface SingleSignalCardProps {
  instrument: "BULL" | "BEAR";
  instrumentInfo?: Instrument;
  signal: SignalData;
  className?: string;
  takeProfitPercent: number;
  stopLossPercent: number;
  onUpdateTakeProfit: (percent: number) => void;
  onUpdateStopLoss: (percent: number) => void;
  isSaving?: boolean;
}

function SingleSignalCard({ 
  instrument, 
  instrumentInfo,
  signal,
  className,
  takeProfitPercent,
  stopLossPercent,
  onUpdateTakeProfit,
  onUpdateStopLoss,
  isSaving,
}: SingleSignalCardProps) {
  const isBull = instrument === "BULL";
  const isBuy = signal.type === "BUY";
  const isSell = signal.type === "SELL";
  
  const instrumentColor = isBull ? "text-primary" : "text-destructive";
  const instrumentBg = isBull ? "bg-primary/10" : "bg-destructive/10";
  const signalColor = isBuy ? "text-primary" : isSell ? "text-destructive" : "text-yellow-500";
  
  const SignalIcon = isBuy ? TrendingUp : isSell ? TrendingDown : Zap;

  return (
    <div className={cn(
      "glass-card rounded-xl p-5 space-y-4",
      isBuy && "ring-2 ring-primary/30",
      isSell && "ring-2 ring-destructive/30",
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center h-12 w-12 rounded-xl",
            instrumentBg
          )}>
            {isBull ? (
              <span className="text-2xl">🐂</span>
            ) : (
              <span className="text-2xl">🐻</span>
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("text-lg font-bold", instrumentColor)}>
                {instrumentInfo?.name || instrument}
              </span>
              {instrumentInfo && (
                <Badge variant="outline" className="text-[10px]">x{instrumentInfo.leverage}</Badge>
              )}
            </div>
            {instrumentInfo && (
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                {instrumentInfo.spreadPercent !== undefined && (
                  <span>Spread: {instrumentInfo.spreadPercent}%</span>
                )}
                {instrumentInfo.avgVolume !== undefined && (
                  <span>Vol: {(instrumentInfo.avgVolume / 1000).toFixed(0)}k/dag</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <SignalIcon className={cn("h-4 w-4", signalColor)} />
              <span className={cn("font-semibold", signalColor)}>
                {isBuy ? "KÖP" : isSell ? "SÄLJ" : "AVVAKTA"}
              </span>
              <Badge 
                variant={signal.strength === "STRONG" ? "default" : "outline"}
                className="text-xs"
              >
                {signal.strength === "STRONG" ? "STARK" : 
                 signal.strength === "MODERATE" ? "MODERAT" : "SVAG"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Confidence */}
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase">Konfidens</p>
          <p className={cn(
            "text-2xl font-bold",
            signal.confidence >= 70 ? "text-primary" : 
            signal.confidence >= 50 ? "text-yellow-500" : "text-muted-foreground"
          )}>
            {signal.confidence}%
          </p>
        </div>
      </div>

      {/* Probability bars */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Up</span>
          <span className="text-primary font-medium">{signal.probabilityUp}%</span>
        </div>
        <div className="flex gap-2 h-2">
          <div 
            className="bg-primary rounded-full transition-all"
            style={{ width: `${signal.probabilityUp}%` }}
          />
          <div 
            className="bg-destructive rounded-full transition-all"
            style={{ width: `${signal.probabilityDown}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Down</span>
          <span className="text-destructive font-medium">{signal.probabilityDown}%</span>
        </div>
      </div>

      {/* Price info - with adjustable target/stop */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/50 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground"></span>
            Pris Nu
          </p>
          <p className="text-lg font-mono font-bold">${signal.currentPrice.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">Entry: ${signal.entryPrice.toFixed(2)}</p>
        </div>
        
        <AdjustablePrice
          type="target"
          basePrice={signal.entryPrice}
          currentPercent={takeProfitPercent}
          onSave={onUpdateTakeProfit}
          isLoading={isSaving}
        />
        
        <AdjustablePrice
          type="stop"
          basePrice={signal.entryPrice}
          currentPercent={stopLossPercent}
          onSave={onUpdateStopLoss}
          isLoading={isSaving}
        />
      </div>

      {/* Reasoning */}
      <div className="bg-muted/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-1">Analys</p>
        <p className="text-sm">{signal.reasoning}</p>
      </div>
    </div>
  );
}

// Helper function to derive BEAR signal from BULL signal
function deriveBearSignal(bullSignal: SignalData): SignalData {
  return {
    ...bullSignal,
    type: bullSignal.type === "BUY" ? "SELL" : 
          bullSignal.type === "SELL" ? "BUY" : "HOLD",
    probabilityUp: bullSignal.probabilityDown,
    probabilityDown: bullSignal.probabilityUp,
    reasoning: bullSignal.type === "BUY" 
      ? `Oljan förväntas stiga → Sälj BEAR eller behåll inte`
      : bullSignal.type === "SELL"
      ? `Oljan förväntas falla → Köp BEAR för att tjäna på nedgång`
      : `Avvakta - ingen tydlig trend`,
  };
}

export function DualSignalCard() {
  const { signal, isLoading } = useActiveSignal();
  const { currentPrice } = usePriceData();
  const { settings, updateSettings, isSaving } = useUserSettings();
  
  // Local state for popover instrument selection
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [tempBullId, setTempBullId] = useState<string>("");
  const [tempBearId, setTempBearId] = useState<string>("");

  // Initialize temp values when popover opens
  useEffect(() => {
    if (popoverOpen && settings) {
      setTempBullId(settings.preferred_bull_id || DEFAULT_BULL_ID);
      setTempBearId(settings.preferred_bear_id || DEFAULT_BEAR_ID);
    }
  }, [popoverOpen, settings]);

  // Auto-match BEAR when BULL changes
  const handleBullChange = (id: string) => {
    setTempBullId(id);
    const matchingBear = findMatchingPair(id);
    if (matchingBear) {
      setTempBearId(matchingBear.id);
    }
  };

  const handleSaveInstruments = async () => {
    await updateSettings({
      preferred_bull_id: tempBullId,
      preferred_bear_id: tempBearId,
    });
    setPopoverOpen(false);
    const bull = OIL_INSTRUMENTS.find(i => i.id === tempBullId);
    const bear = OIL_INSTRUMENTS.find(i => i.id === tempBearId);
    toast({
      title: "Certifikat uppdaterade",
      description: `BULL: ${bull?.name}, BEAR: ${bear?.name}`,
    });
  };

  const handleUpdateTakeProfit = (percent: number) => {
    updateSettings({ take_profit_percent: percent });
    toast({
      title: "Take-profit uppdaterad",
      description: `Satt till +${percent.toFixed(1)}%`,
    });
  };

  const handleUpdateStopLoss = (percent: number) => {
    updateSettings({ stop_loss_percent: percent });
    toast({
      title: "Stop-loss uppdaterad",
      description: `Satt till -${percent.toFixed(1)}%`,
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const takeProfitPercent = settings?.take_profit_percent ?? 1;
  const stopLossPercent = settings?.stop_loss_percent ?? 2;
  
  // Get user's preferred instruments
  const bullId = settings?.preferred_bull_id || DEFAULT_BULL_ID;
  const bearId = settings?.preferred_bear_id || DEFAULT_BEAR_ID;
  const bullInstrument = OIL_INSTRUMENTS.find(i => i.id === bullId);
  const bearInstrument = OIL_INSTRUMENTS.find(i => i.id === bearId);

  const bullSignal: SignalData = {
    type: signal?.signal_type ?? "HOLD",
    strength: signal?.strength ?? "MODERATE",
    confidence: signal?.confidence ?? 0,
    probabilityUp: signal?.probability_up ?? 50,
    probabilityDown: signal?.probability_down ?? 50,
    currentPrice: currentPrice ?? 0,
    entryPrice: signal?.current_price ?? currentPrice ?? 0,
    targetPrice: signal?.target_price ?? 0,
    stopLoss: signal?.stop_loss ?? 0,
    reasoning: signal?.reasoning ?? "Ingen aktiv signal",
  };

  const bearSignal = deriveBearSignal(bullSignal);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Settings2 className="h-3.5 w-3.5" />
              Byt certifikat
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 bg-card border shadow-lg z-50" align="end">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">Välj certifikat</h4>
                <p className="text-xs text-muted-foreground">
                  BEAR matchas automatiskt med samma hävstång
                </p>
              </div>
              
              <div className="space-y-3">
                <InstrumentSelector
                  type="BULL"
                  selectedId={tempBullId}
                  onSelect={handleBullChange}
                />
                
                <InstrumentSelector
                  type="BEAR"
                  selectedId={tempBearId}
                  onSelect={setTempBearId}
                />
              </div>

              <Button 
                onClick={handleSaveInstruments} 
                disabled={isSaving}
                className="w-full gap-2"
                size="sm"
              >
                <Check className="h-4 w-4" />
                {isSaving ? "Sparar..." : "Spara"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SingleSignalCard 
          instrument="BULL"
          instrumentInfo={bullInstrument}
          signal={bullSignal}
          takeProfitPercent={takeProfitPercent}
          stopLossPercent={stopLossPercent}
          onUpdateTakeProfit={handleUpdateTakeProfit}
          onUpdateStopLoss={handleUpdateStopLoss}
          isSaving={isSaving}
        />
        <SingleSignalCard 
          instrument="BEAR"
          instrumentInfo={bearInstrument}
          signal={bearSignal}
          takeProfitPercent={takeProfitPercent}
          stopLossPercent={stopLossPercent}
          onUpdateTakeProfit={handleUpdateTakeProfit}
          onUpdateStopLoss={handleUpdateStopLoss}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}