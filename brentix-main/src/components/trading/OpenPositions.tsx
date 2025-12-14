import { useState } from "react";
import { TrendingUp, TrendingDown, X, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { usePaperTrades, type PaperTrade } from "@/hooks/usePaperTrades";
import { usePriceData } from "@/hooks/usePriceData";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

export function OpenPositions() {
  const { openTrades, isLoading, isClosing, closePosition, calculateUnrealizedPL } = usePaperTrades();
  const { currentPrice } = usePriceData();
  const [confirmClose, setConfirmClose] = useState<PaperTrade | null>(null);

  const handleClosePosition = async () => {
    if (!confirmClose) return;
    
    try {
      await closePosition(confirmClose.id);
      toast({
        title: "Position stängd",
        description: `Din ${confirmClose.instrument_type || "position"} har stängts.`,
      });
    } catch {
      toast({
        title: "Fel",
        description: "Kunde inte stänga positionen. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setConfirmClose(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Öppna Positioner</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (openTrades.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Öppna Positioner
            <Badge variant="secondary" className="text-xs">0</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Inga öppna positioner</p>
            <p className="text-xs mt-1">Använd handelsknapparna för att öppna en position</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total unrealized P/L
  const totalUnrealizedPL = openTrades.reduce((sum, trade) => {
    const { plSek } = calculateUnrealizedPL(trade);
    return sum + plSek;
  }, 0);

  const totalExposure = openTrades.reduce((sum, trade) => sum + trade.position_value_sek, 0);

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              Öppna Positioner
              <Badge variant="secondary" className="text-xs">{openTrades.length}</Badge>
            </CardTitle>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Orealiserad P/L</p>
              <p className={cn(
                "font-mono font-bold",
                totalUnrealizedPL >= 0 ? "text-primary" : "text-destructive"
              )}>
                {totalUnrealizedPL >= 0 ? "+" : ""}{totalUnrealizedPL.toFixed(0)} SEK
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Summary row */}
          <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg text-sm">
            <span className="text-muted-foreground">Total exponering</span>
            <span className="font-mono font-medium">{totalExposure.toLocaleString()} SEK</span>
          </div>

          {/* Individual positions */}
          {openTrades.map((trade) => {
            const { plSek, plPercent } = calculateUnrealizedPL(trade);
            const isBull = trade.instrument_type === "BULL" || trade.direction === "BUY";
            
            return (
              <div
                key={trade.id}
                className="flex items-center justify-between py-3 px-4 bg-card border border-border rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    isBull ? "bg-primary/10" : "bg-destructive/10"
                  )}>
                    {isBull ? (
                      <TrendingUp className="h-5 w-5 text-primary" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {trade.instrument_type || (isBull ? "BULL" : "BEAR")}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {trade.direction || "BUY"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">${trade.entry_price.toFixed(2)}</span>
                      <span>→</span>
                      <span className="font-mono">${currentPrice?.toFixed(2) ?? "—"}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(trade.entry_timestamp), "d MMM HH:mm", { locale: sv })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={cn(
                      "font-mono font-bold",
                      plSek >= 0 ? "text-primary" : "text-destructive"
                    )}>
                      {plSek >= 0 ? "+" : ""}{plSek.toFixed(0)} SEK
                    </p>
                    <p className={cn(
                      "text-xs font-mono",
                      plPercent >= 0 ? "text-primary/80" : "text-destructive/80"
                    )}>
                      {plPercent >= 0 ? "+" : ""}{plPercent.toFixed(2)}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {trade.position_value_sek.toLocaleString()} SEK
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmClose(trade)}
                    disabled={isClosing}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    {isClosing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Close Position Confirmation Dialog */}
      <AlertDialog open={!!confirmClose} onOpenChange={() => setConfirmClose(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <AlertDialogTitle className="text-xl">
                Stäng Position?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3">
              {confirmClose && (
                <>
                  <p>
                    Du är på väg att stänga din <strong>{confirmClose.instrument_type || "position"}</strong> position.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ingångspris:</span>
                      <span className="font-mono">${confirmClose.entry_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nuvarande pris:</span>
                      <span className="font-mono">${currentPrice?.toFixed(2) ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Positionsvärde:</span>
                      <span className="font-mono">{confirmClose.position_value_sek.toLocaleString()} SEK</span>
                    </div>
                    {(() => {
                      const { plSek, plPercent } = calculateUnrealizedPL(confirmClose);
                      return (
                        <div className="flex justify-between pt-2 border-t border-border">
                          <span className="font-medium">Resultat:</span>
                          <span className={cn(
                            "font-mono font-bold",
                            plSek >= 0 ? "text-primary" : "text-destructive"
                          )}>
                            {plSek >= 0 ? "+" : ""}{plSek.toFixed(0)} SEK ({plPercent >= 0 ? "+" : ""}{plPercent.toFixed(2)}%)
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClosePosition}
              disabled={isClosing}
            >
              {isClosing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Stänger...
                </>
              ) : (
                "Stäng Position"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
