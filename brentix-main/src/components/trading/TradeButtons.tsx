import { useState } from "react";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ManualTradeModal } from "./ManualTradeModal";
import { useUserSettings } from "@/hooks/useUserSettings";
import { usePriceData } from "@/hooks/usePriceData";
import { useActiveSignal } from "@/hooks/useSignals";
import type { TradeDirection, InstrumentType } from "@/hooks/useManualTrade";

interface TradeButtonsProps {
  /** 
   * Mode: 
   * - "pair" = Both BULL and BEAR available (default)
   * - "bull-only" = Only BULL instrument
   * - "bear-only" = Only BEAR instrument
   */
  mode?: "pair" | "bull-only" | "bear-only";
  /** Show current price */
  showPrice?: boolean;
  /** Show signal indicator */
  showSignal?: boolean;
  /** Custom class */
  className?: string;
}

export function TradeButtons({ 
  mode = "pair",
  showPrice = true,
  showSignal = true,
  className 
}: TradeButtonsProps) {
  const { settings } = useUserSettings();
  const { currentPrice, isLoading: priceLoading } = usePriceData();
  const { signal } = useActiveSignal();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState<TradeDirection>("BUY");
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>("BULL");

  const isPaperTrading = settings?.paper_trading_enabled ?? true;
  
  // Determine which button should be "highlighted" based on signal
  const signalType = signal?.signal_type;
  const isBuySignal = signalType === "BUY";
  const isSellSignal = signalType === "SELL";

  // Get the instrument based on mode
  const getInstrument = (direction: TradeDirection): InstrumentType => {
    if (mode === "bull-only") return "BULL";
    if (mode === "bear-only") return "BEAR";
    // In pair mode: BUY = BULL (price going up), SELL = BEAR (price going down)
    return direction === "BUY" ? "BULL" : "BEAR";
  };

  const handleTrade = (direction: TradeDirection) => {
    setSelectedDirection(direction);
    setSelectedInstrument(getInstrument(direction));
    setIsModalOpen(true);
  };

  // Instrument label for display
  const getInstrumentLabel = () => {
    if (mode === "bull-only") return "BULL OLJA X15";
    if (mode === "bear-only") return "BEAR OLJA X15";
    return "BULL / BEAR X15";
  };

  return (
    <>
      <div className={cn(
        "glass-card rounded-2xl p-6",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-lg">Handla</h3>
            <p className="text-sm text-muted-foreground">{getInstrumentLabel()}</p>
          </div>
          <div className="flex items-center gap-2">
            {showSignal && signal && signalType !== "HOLD" && (
              <Badge 
                variant={isBuySignal ? "default" : "destructive"}
                className="animate-pulse"
              >
                {isBuySignal ? "🟢 KÖP-signal" : "🔴 SÄLJ-signal"}
              </Badge>
            )}
            {isPaperTrading ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                📝 Paper
              </Badge>
            ) : (
              <Badge variant="destructive">💰 Live</Badge>
            )}
          </div>
        </div>

        {/* Price Display */}
        {showPrice && (
          <div className="text-center mb-8 py-4 bg-muted/30 rounded-xl">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Brent Crude Oil
            </p>
            {priceLoading ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            ) : (
              <p className="text-3xl font-bold font-mono">${currentPrice?.toFixed(2) ?? "—"}</p>
            )}
          </div>
        )}

        {/* Trade Buttons - Large and well separated */}
        <div className="space-y-4">
          {/* BUY Button */}
          <Button
            size="lg"
            onClick={() => handleTrade("BUY")}
            className={cn(
              "w-full h-20 text-xl font-bold transition-all duration-300",
              "flex items-center justify-center gap-4",
              // Normal state
              "bg-primary hover:bg-primary/90",
              // Highlighted when BUY signal
              isBuySignal && "ring-4 ring-primary/50 shadow-lg shadow-primary/25 scale-[1.02]",
              // Dimmed when SELL signal
              isSellSignal && "opacity-60"
            )}
          >
            <TrendingUp className="h-8 w-8" />
            <div className="flex flex-col items-start">
              <span>KÖP</span>
              {mode === "pair" && (
                <span className="text-xs font-normal opacity-80">BULL - Olja stiger</span>
              )}
            </div>
          </Button>

          {/* Separator with signal indicator */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-xs text-muted-foreground uppercase">
                eller
              </span>
            </div>
          </div>

          {/* SELL Button */}
          <Button
            size="lg"
            variant="destructive"
            onClick={() => handleTrade("SELL")}
            className={cn(
              "w-full h-20 text-xl font-bold transition-all duration-300",
              "flex items-center justify-center gap-4",
              // Highlighted when SELL signal
              isSellSignal && "ring-4 ring-destructive/50 shadow-lg shadow-destructive/25 scale-[1.02]",
              // Dimmed when BUY signal
              isBuySignal && "opacity-60"
            )}
          >
            <TrendingDown className="h-8 w-8" />
            <div className="flex flex-col items-start">
              <span>SÄLJ</span>
              {mode === "pair" && (
                <span className="text-xs font-normal opacity-80">BEAR - Olja faller</span>
              )}
            </div>
          </Button>
        </div>

        {/* Signal hint */}
        {showSignal && signal && signalType !== "HOLD" && (
          <div className={cn(
            "mt-6 p-3 rounded-lg text-sm text-center",
            isBuySignal ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          )}>
            <p className="font-medium">
              {isBuySignal 
                ? "📈 Signalen rekommenderar KÖP" 
                : "📉 Signalen rekommenderar SÄLJ"}
            </p>
            <p className="text-xs opacity-80 mt-1">
              Konfidens: {signal.confidence}% • {signal.strength}
            </p>
          </div>
        )}
      </div>

      <ManualTradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultDirection={selectedDirection}
        defaultInstrument={selectedInstrument}
      />
    </>
  );
}

/**
 * Compact version of trade buttons for header or sidebar
 */
export function TradeButtonsCompact({ className }: { className?: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState<TradeDirection>("BUY");
  const { signal } = useActiveSignal();
  
  const signalType = signal?.signal_type;
  const isBuySignal = signalType === "BUY";
  const isSellSignal = signalType === "SELL";

  return (
    <>
      <div className={cn("flex items-center gap-3", className)}>
        <Button
          size="default"
          onClick={() => {
            setSelectedDirection("BUY");
            setIsModalOpen(true);
          }}
          className={cn(
            "gap-2 min-w-[100px]",
            isBuySignal && "ring-2 ring-primary/50"
          )}
        >
          <TrendingUp className="h-4 w-4" />
          KÖP
        </Button>
        
        <Button
          size="default"
          variant="destructive"
          onClick={() => {
            setSelectedDirection("SELL");
            setIsModalOpen(true);
          }}
          className={cn(
            "gap-2 min-w-[100px]",
            isSellSignal && "ring-2 ring-destructive/50"
          )}
        >
          <TrendingDown className="h-4 w-4" />
          SÄLJ
        </Button>
      </div>

      <ManualTradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultDirection={selectedDirection}
        defaultInstrument={selectedDirection === "BUY" ? "BULL" : "BEAR"}
      />
    </>
  );
}
