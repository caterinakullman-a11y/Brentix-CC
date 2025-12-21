import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ManualTradeModal } from "./ManualTradeModal";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useActiveSignal } from "@/hooks/useSignals";
import { OIL_INSTRUMENTS, DEFAULT_BULL_ID, DEFAULT_BEAR_ID } from "@/constants/instruments";
import type { TradeDirection, InstrumentType } from "@/hooks/useManualTrade";

interface FourWayTradeButtonsProps {
  className?: string;
  showRecommendation?: boolean;
}

export function FourWayTradeButtons({ 
  className,
  showRecommendation = true 
}: FourWayTradeButtonsProps) {
  const { settings } = useUserSettings();
  const { signal } = useActiveSignal();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState<TradeDirection>("BUY");
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>("BULL");

  const isPaperTrading = settings?.paper_trading_enabled ?? true;
  
  // Get user's preferred instruments
  const bullId = settings?.preferred_bull_id || DEFAULT_BULL_ID;
  const bearId = settings?.preferred_bear_id || DEFAULT_BEAR_ID;
  const bullInstrument = OIL_INSTRUMENTS.find(i => i.id === bullId);
  const bearInstrument = OIL_INSTRUMENTS.find(i => i.id === bearId);
  
  const signalType = signal?.signal_type;
  const isBullish = signalType === "BUY";
  const isBearish = signalType === "SELL";

  const recommendations = {
    buyBull: isBullish,
    sellBull: isBearish,
    buyBear: isBearish,
    sellBear: isBullish,
  };

  const handleTrade = (direction: TradeDirection, instrument: InstrumentType) => {
    setSelectedDirection(direction);
    setSelectedInstrument(instrument);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className={cn("space-y-4", className)}>
        {/* BULL + BEAR sida vid sida på md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* BULL Section */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐂</span>
              <div className="flex-1">
                <span className="font-semibold text-primary">{bullInstrument?.name || "BULL"}</span>
                {bullInstrument && (
                  <Badge variant="outline" className="ml-2 text-xs">x{bullInstrument.leverage}</Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Tjänar när oljan stiger ↗</p>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                onClick={() => handleTrade("BUY", "BULL")}
                className={cn(
                  "h-12 flex-col gap-0.5 bg-primary hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  showRecommendation && recommendations.buyBull &&
                    "ring-2 ring-primary/50 shadow-lg shadow-primary/20"
                )}
                aria-label={`Köp ${bullInstrument?.name || 'BULL'} certifikat${recommendations.buyBull ? ' - Rekommenderas' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                  <span className="font-bold">KÖP</span>
                </div>
                {showRecommendation && recommendations.buyBull && (
                  <span className="text-[10px] opacity-80">✨ Rekommenderas</span>
                )}
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => handleTrade("SELL", "BULL")}
                className={cn(
                  "h-12 flex-col gap-0.5 border-primary/30 hover:bg-primary/10 focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  showRecommendation && recommendations.sellBull &&
                    "ring-2 ring-destructive/50 border-destructive/50"
                )}
                aria-label={`Sälj ${bullInstrument?.name || 'BULL'} certifikat${recommendations.sellBull ? ' - Stäng position' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" aria-hidden="true" />
                  <span className="font-bold">SÄLJ</span>
                </div>
                {showRecommendation && recommendations.sellBull && (
                  <span className="text-[10px] text-destructive">⚠️ Stäng</span>
                )}
              </Button>
            </div>
          </div>

          {/* BEAR Section */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐻</span>
              <div className="flex-1">
                <span className="font-semibold text-destructive">{bearInstrument?.name || "BEAR"}</span>
                {bearInstrument && (
                  <Badge variant="outline" className="ml-2 text-xs">x{bearInstrument.leverage}</Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Tjänar när oljan faller ↘</p>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                variant="destructive"
                onClick={() => handleTrade("BUY", "BEAR")}
                className={cn(
                  "h-12 flex-col gap-0.5 focus:ring-2 focus:ring-destructive focus:ring-offset-2",
                  showRecommendation && recommendations.buyBear &&
                    "ring-2 ring-destructive/50 shadow-lg shadow-destructive/20"
                )}
                aria-label={`Köp ${bearInstrument?.name || 'BEAR'} certifikat${recommendations.buyBear ? ' - Rekommenderas' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" aria-hidden="true" />
                  <span className="font-bold">KÖP</span>
                </div>
                {showRecommendation && recommendations.buyBear && (
                  <span className="text-[10px] opacity-80">✨ Rekommenderas</span>
                )}
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => handleTrade("SELL", "BEAR")}
                className={cn(
                  "h-12 flex-col gap-0.5 border-destructive/30 hover:bg-destructive/10 focus:ring-2 focus:ring-destructive focus:ring-offset-2",
                  showRecommendation && recommendations.sellBear &&
                    "ring-2 ring-primary/50 border-primary/50"
                )}
                aria-label={`Sälj ${bearInstrument?.name || 'BEAR'} certifikat${recommendations.sellBear ? ' - Stäng position' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                  <span className="font-bold">SÄLJ</span>
                </div>
                {showRecommendation && recommendations.sellBear && (
                  <span className="text-[10px] text-primary">⚠️ Stäng</span>
                )}
              </Button>
            </div>
          </div>
        </div>
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

export function FourWayTradeButtonsCompact({ className }: { className?: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState<TradeDirection>("BUY");
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>("BULL");

  const handleTrade = (direction: TradeDirection, instrument: InstrumentType) => {
    setSelectedDirection(direction);
    setSelectedInstrument(instrument);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        <Button
          size="sm"
          onClick={() => handleTrade("BUY", "BULL")}
          className="bg-primary hover:bg-primary/90"
        >
          🐂 Köp BULL
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleTrade("SELL", "BULL")}
        >
          🐂 Sälj BULL
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleTrade("BUY", "BEAR")}
        >
          🐻 Köp BEAR
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleTrade("SELL", "BEAR")}
        >
          🐻 Sälj BEAR
        </Button>
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