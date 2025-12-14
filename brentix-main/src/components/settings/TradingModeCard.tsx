import { useState } from "react";
import { FileText, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TradingModeToggle } from "@/components/ui/trading-mode-toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TradingModeCardProps {
  paperTradingEnabled: boolean;
  paperBalance: number;
  paperStartingBalance: number;
  onPaperTradingChange: (enabled: boolean) => void;
  onPaperBalanceChange: (balance: number) => void;
  onResetBalance: () => void;
}

export function TradingModeCard({
  paperTradingEnabled,
  paperBalance,
  paperStartingBalance,
  onPaperTradingChange,
  onPaperBalanceChange,
  onResetBalance,
}: TradingModeCardProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleToggle = (isPaperTrading: boolean) => {
    // If switching FROM paper TO live, show confirmation
    if (paperTradingEnabled && !isPaperTrading) {
      setShowConfirmDialog(true);
    } else {
      onPaperTradingChange(isPaperTrading);
    }
  };

  const confirmLiveTrading = () => {
    onPaperTradingChange(false);
    setShowConfirmDialog(false);
  };

  return (
    <>
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <FileText className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Trading Mode</h2>
            <p className="text-sm text-muted-foreground">Choose between simulation and live trading</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Slide Toggle */}
          <div className="flex flex-col items-center gap-3 py-4">
            <TradingModeToggle
              isPaperTrading={paperTradingEnabled}
              onToggle={handleToggle}
            />
            <p className="text-xs text-muted-foreground text-center">
              {paperTradingEnabled 
                ? "Simulerad handel - inga riktiga pengar" 
                : "Live handel - riktiga pengar används"}
            </p>
          </div>

          {paperTradingEnabled && (
            <>
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-4">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Paper trading uses simulated money. No real trades are executed.
                </p>
              </div>

              <div>
                <Label htmlFor="paper_balance" className="text-sm font-medium">
                  Paper Balance (SEK)
                </Label>
                <Input
                  id="paper_balance"
                  type="number"
                  value={paperBalance}
                  onChange={(e) => onPaperBalanceChange(Number(e.target.value))}
                  className="mt-2"
                  min={0}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Starting Balance</p>
                  <p className="font-mono font-medium text-foreground">
                    {paperStartingBalance.toLocaleString()} SEK
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResetBalance}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Balance
                </Button>
              </div>
            </>
          )}

          {!paperTradingEnabled && (
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
              <p className="text-xs text-destructive">
                ⚠️ Live trading mode is active. Real money will be used for trades.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">
                Aktivera Live Trading?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3">
              <p>
                Du är på väg att byta till <strong className="text-destructive">Live Trading</strong>. 
                Detta innebär att:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Riktiga pengar kommer användas för alla trades</li>
                <li>Ordrar skickas direkt till Avanza</li>
                <li>Förluster är verkliga och oåterkalleliga</li>
              </ul>
              <p className="font-medium pt-2">
                Är du säker på att du vill fortsätta?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLiveTrading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ja, aktivera Live Trading
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
