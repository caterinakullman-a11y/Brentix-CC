import { useState } from "react";
import { TrendingUp, TrendingDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ManualTradeModal } from "./ManualTradeModal";
import { useUserSettings } from "@/hooks/useUserSettings";
import { usePriceData } from "@/hooks/usePriceData";
import type { TradeDirection, InstrumentType } from "@/hooks/useManualTrade";

interface QuickTradeButtonsProps {
  variant?: "default" | "compact" | "large";
  showPrice?: boolean;
  className?: string;
}

export function QuickTradeButtons({ 
  variant = "default", 
  showPrice = true,
  className 
}: QuickTradeButtonsProps) {
  const { settings } = useUserSettings();
  const { currentPrice } = usePriceData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultDirection, setDefaultDirection] = useState<TradeDirection>("BUY");
  const [defaultInstrument, setDefaultInstrument] = useState<InstrumentType>("BULL");

  const isPaperTrading = settings?.paper_trading_enabled ?? true;

  const handleQuickTrade = (direction: TradeDirection, instrument: InstrumentType) => {
    setDefaultDirection(direction);
    setDefaultInstrument(instrument);
    setIsModalOpen(true);
  };

  if (variant === "compact") {
    return (
      <>
        <div className={cn("flex items-center gap-2", className)}>
          <Button
            size="sm"
            onClick={() => handleQuickTrade("BUY", "BULL")}
            className="bg-primary hover:bg-primary/90 gap-1"
          >
            <TrendingUp className="h-3 w-3" />
            Köp
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleQuickTrade("SELL", "BEAR")}
            className="gap-1"
          >
            <TrendingDown className="h-3 w-3" />
            Sälj
          </Button>
        </div>

        <ManualTradeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          defaultDirection={defaultDirection}
          defaultInstrument={defaultInstrument}
        />
      </>
    );
  }

  if (variant === "large") {
    return (
      <>
        <div className={cn("space-y-4", className)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Snabbhandel</h3>
            </div>
            {isPaperTrading ? (
              <Badge variant="outline">📝 Paper</Badge>
            ) : (
              <Badge variant="destructive">💰 Live</Badge>
            )}
          </div>

          {showPrice && (
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground">Aktuellt pris</p>
              <p className="text-2xl font-bold font-mono">${currentPrice.toFixed(2)}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              onClick={() => handleQuickTrade("BUY", "BULL")}
              className="flex-col h-auto py-4 bg-primary hover:bg-primary/90"
            >
              <TrendingUp className="h-6 w-6 mb-1" />
              <span className="font-bold">KÖP BULL</span>
              <span className="text-xs opacity-80">Olja stiger</span>
            </Button>
            <Button
              size="lg"
              variant="destructive"
              onClick={() => handleQuickTrade("BUY", "BEAR")}
              className="flex-col h-auto py-4"
            >
              <TrendingDown className="h-6 w-6 mb-1" />
              <span className="font-bold">KÖP BEAR</span>
              <span className="text-xs opacity-80">Olja faller</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => handleQuickTrade("SELL", "BULL")}
              className="flex-col h-auto py-3 border-primary/30 hover:border-primary"
            >
              <span className="text-sm">Sälj BULL</span>
              <span className="text-xs text-muted-foreground">Stäng lång</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickTrade("SELL", "BEAR")}
              className="flex-col h-auto py-3 border-destructive/30 hover:border-destructive"
            >
              <span className="text-sm">Sälj BEAR</span>
              <span className="text-xs text-muted-foreground">Stäng kort</span>
            </Button>
          </div>
        </div>

        <ManualTradeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          defaultDirection={defaultDirection}
          defaultInstrument={defaultInstrument}
        />
      </>
    );
  }

  // Default variant
  return (
    <>
      <div className={cn(
        "glass-card rounded-xl p-4 space-y-4",
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Manuell Handel</h3>
              <p className="text-xs text-muted-foreground">
                {isPaperTrading ? "Paper trading" : "Live via Avanza"}
              </p>
            </div>
          </div>
          {showPrice && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Pris</p>
              <p className="font-mono font-bold">${currentPrice.toFixed(2)}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleQuickTrade("BUY", "BULL")}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Köp BULL
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleQuickTrade("BUY", "BEAR")}
            className="gap-2"
          >
            <TrendingDown className="h-4 w-4" />
            Köp BEAR
          </Button>
        </div>
      </div>

      <ManualTradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultDirection={defaultDirection}
        defaultInstrument={defaultInstrument}
      />
    </>
  );
}
