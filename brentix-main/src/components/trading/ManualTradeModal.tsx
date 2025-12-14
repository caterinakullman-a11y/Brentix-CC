import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Wallet,
  BarChart3,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useManualTrade, type TradeDirection, type InstrumentType } from "@/hooks/useManualTrade";
import { useUserSettings } from "@/hooks/useUserSettings";

interface ManualTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDirection?: TradeDirection;
  defaultInstrument?: InstrumentType;
}

export function ManualTradeModal({
  isOpen,
  onClose,
  defaultDirection = "BUY",
  defaultInstrument = "BULL",
}: ManualTradeModalProps) {
  const { executeTrade, isProcessing, isPaperTrading, currentPrice } = useManualTrade();
  const { settings } = useUserSettings();

  const [direction, setDirection] = useState<TradeDirection>(defaultDirection);
  const [instrumentType, setInstrumentType] = useState<InstrumentType>(defaultInstrument);
  const [amountSEK, setAmountSEK] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDirection(defaultDirection);
      setInstrumentType(defaultInstrument);
      setAmountSEK(settings?.position_size_sek?.toString() || "1000");
      setNotes("");
      setShowConfirm(false);
    }
  }, [isOpen, defaultDirection, defaultInstrument, settings?.position_size_sek]);

  const amount = parseFloat(amountSEK) || 0;
  const quantity = currentPrice > 0 ? Math.floor(amount / currentPrice) : 0;
  const actualCost = quantity * currentPrice;
  const paperBalance = Number(settings?.paper_balance) || 100000;

  const isValidAmount = amount >= 100;
  const hasEnoughBalance = isPaperTrading ? amount <= paperBalance : true;
  const canTrade = isValidAmount && hasEnoughBalance && quantity >= 1 && !isProcessing;

  const handleSubmit = () => {
    if (!canTrade) return;
    
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    executeTrade({
      direction,
      instrumentType,
      amountSEK: amount,
      price: currentPrice,
      notes: notes || undefined,
    });

    onClose();
  };

  const handleCancel = () => {
    if (showConfirm) {
      setShowConfirm(false);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Manuell Handel
          </DialogTitle>
          <DialogDescription>
            {isPaperTrading ? (
              <Badge variant="outline" className="mt-1">
                📝 Paper Trading - Inga riktiga pengar
              </Badge>
            ) : (
              <Badge variant="destructive" className="mt-1">
                💰 LIVE - Riktiga pengar via Avanza
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {!showConfirm ? (
          <div className="space-y-6 py-4">
            {/* Direction Selection */}
            <div className="space-y-2">
              <Label>Riktning</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDirection("BUY")}
                  className={cn(
                    "flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all",
                    direction === "BUY"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <TrendingUp className="h-5 w-5" />
                  <span className="font-semibold">KÖP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("SELL")}
                  className={cn(
                    "flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all",
                    direction === "SELL"
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-border hover:border-destructive/50"
                  )}
                >
                  <TrendingDown className="h-5 w-5" />
                  <span className="font-semibold">SÄLJ</span>
                </button>
              </div>
            </div>

            {/* Instrument Selection */}
            <div className="space-y-2">
              <Label>Instrument</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setInstrumentType("BULL")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 p-4 rounded-lg border-2 transition-all",
                    instrumentType === "BULL"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl">🐂</span>
                  <span className="font-semibold">BULL</span>
                  <span className="text-xs text-muted-foreground">Olja X15</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInstrumentType("BEAR")}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 p-4 rounded-lg border-2 transition-all",
                    instrumentType === "BEAR"
                      ? "border-destructive bg-destructive/10"
                      : "border-border hover:border-destructive/50"
                  )}
                >
                  <span className="text-2xl">🐻</span>
                  <span className="font-semibold">BEAR</span>
                  <span className="text-xs text-muted-foreground">Olja X15</span>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Belopp (SEK)</Label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  value={amountSEK}
                  onChange={(e) => setAmountSEK(e.target.value)}
                  placeholder="1000"
                  className="pl-10"
                  min={100}
                  step={100}
                />
              </div>
              {isPaperTrading && (
                <p className="text-xs text-muted-foreground">
                  Tillgängligt: {paperBalance.toLocaleString("sv-SE")} SEK
                </p>
              )}
              {!isValidAmount && amountSEK && (
                <p className="text-xs text-destructive">Minsta belopp är 100 SEK</p>
              )}
              {!hasEnoughBalance && (
                <p className="text-xs text-destructive">Otillräckligt saldo</p>
              )}
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2 flex-wrap">
              {[500, 1000, 2500, 5000, 10000].map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmountSEK(preset.toString())}
                  className={cn(
                    "flex-1 min-w-[60px]",
                    amountSEK === preset.toString() && "border-primary"
                  )}
                >
                  {preset >= 1000 ? `${preset / 1000}k` : preset}
                </Button>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Anteckning (valfritt)
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="T.ex. 'RSI ser översåld ut' eller 'Tar vinst'"
                className="resize-none"
                rows={2}
              />
            </div>

            {/* Order Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Aktuellt pris:</span>
                <span className="font-mono">${currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Antal enheter:</span>
                <span className="font-mono">{quantity} st</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Faktisk kostnad:</span>
                <span className="font-mono">{actualCost.toLocaleString("sv-SE")} SEK</span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between font-medium">
                  <span>Order:</span>
                  <span className={direction === "BUY" ? "text-primary" : "text-destructive"}>
                    {direction} {quantity} {instrumentType}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
                disabled={isProcessing}
              >
                Avbryt
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canTrade}
                className={cn(
                  "flex-1 gap-2",
                  direction === "BUY" 
                    ? "bg-primary hover:bg-primary/90" 
                    : "bg-destructive hover:bg-destructive/90"
                )}
              >
                Granska Order
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* Confirmation Screen */
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4">
              <div className={cn(
                "mx-auto w-16 h-16 rounded-full flex items-center justify-center",
                direction === "BUY" ? "bg-primary/10" : "bg-destructive/10"
              )}>
                {direction === "BUY" ? (
                  <TrendingUp className="h-8 w-8 text-primary" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-destructive" />
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold">Bekräfta Order</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Är du säker på att du vill genomföra denna handel?
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Typ:</span>
                <span className={cn(
                  "font-bold",
                  direction === "BUY" ? "text-primary" : "text-destructive"
                )}>
                  {direction === "BUY" ? "KÖP" : "SÄLJ"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Instrument:</span>
                <span className="font-bold">{instrumentType} OLJA X15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Antal:</span>
                <span className="font-mono">{quantity} st</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pris:</span>
                <span className="font-mono">${currentPrice.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{actualCost.toLocaleString("sv-SE")} SEK</span>
                </div>
              </div>
            </div>

            {!isPaperTrading && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Varning: Riktig handel!</p>
                  <p className="text-muted-foreground">
                    Denna order kommer att skickas till Avanza och påverka ditt riktiga konto.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
                disabled={isProcessing}
              >
                Tillbaka
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isProcessing}
                className={cn(
                  "flex-1 gap-2",
                  direction === "BUY" 
                    ? "bg-primary hover:bg-primary/90" 
                    : "bg-destructive hover:bg-destructive/90"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Bearbetar...
                  </>
                ) : (
                  <>
                    Bekräfta {direction === "BUY" ? "Köp" : "Sälj"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
