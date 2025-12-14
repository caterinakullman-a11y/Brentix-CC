import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, TrendingUp, TrendingDown, Star, AlertCircle, RefreshCw } from "lucide-react";
import {
  useInstruments,
  useInstrumentPairs,
  useUserInstrumentPairs,
  useSetUserPair,
  InstrumentPair,
  Instrument,
} from "@/hooks/useInstruments";
import { CorrelationAnalysis } from "@/components/pairs/CorrelationAnalysis";
import { toast } from "sonner";

export default function Pairs() {
  const { data: instruments, isLoading: loadingInstruments, refetch: refetchInstruments } = useInstruments();
  const { data: pairs, isLoading: loadingPairs, error } = useInstrumentPairs();
  const { data: userPairs } = useUserInstrumentPairs();
  const setUserPair = useSetUserPair();

  const [selectedPair, setSelectedPair] = useState<InstrumentPair | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isLoading = loadingInstruments || loadingPairs;

  const handleSelectPair = async (pair: InstrumentPair) => {
    try {
      await setUserPair.mutateAsync({
        primaryId: pair.bull_instrument_id,
        counterweightId: pair.bear_instrument_id,
      });
      toast.success("Par valt som standard");
    } catch {
      toast.error("Kunde inte välja par");
    }
  };

  const handleRefreshPrices = async () => {
    setIsRefreshing(true);
    try {
      await refetchInstruments();
      toast.success("Priser uppdaterade");
    } catch {
      toast.error("Kunde inte uppdatera priser");
    } finally {
      setIsRefreshing(false);
    }
  };

  const activePair = userPairs?.[0];
  const bullInstruments = instruments?.filter((i) => i.type === "BULL") || [];
  const bearInstruments = instruments?.filter((i) => i.type === "BEAR") || [];

  const formatPrice = (price: number | null) => {
    if (price === null) return "--";
    return price.toFixed(2);
  };

  const formatChange = (change: number | null) => {
    if (change === null) return null;
    return change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;
  };

  const InstrumentRow = ({ inst }: { inst: Instrument }) => (
    <div className="flex items-center justify-between p-3 rounded bg-muted/50 hover:bg-muted/70 transition-colors">
      <div className="flex-1">
        <span className="text-sm font-medium">{inst.name}</span>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">{inst.leverage}x</Badge>
          <span className="text-xs text-muted-foreground">{inst.issuer}</span>
        </div>
      </div>
      <div className="text-right">
        <span className="text-sm font-mono font-medium">
          {formatPrice(inst.current_price)} {inst.currency}
        </span>
        {inst.daily_change_percent !== null && (
          <div className={`text-xs font-mono ${
            inst.daily_change_percent >= 0 ? "text-[#5B9A6F]" : "text-[#9A5B5B]"
          }`}>
            {formatChange(inst.daily_change_percent)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <MainLayout>
      <Helmet>
        <title>BULL/BEAR Par - BRENTIX</title>
        <meta name="description" content="Välj och hantera BULL/BEAR instrumentpar" />
      </Helmet>

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">BULL/BEAR Par</h1>
            <p className="text-muted-foreground text-sm">
              Välj instrumentpar för motviktsstrategi och hedging
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshPrices}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Uppdatera priser
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Kunde inte ladda instrument</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        )}

        {/* Active Pair */}
        {activePair && (
          <Card className="border-[#5B9A6F]/50 bg-[#5B9A6F]/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Check className="h-4 w-4 text-[#5B9A6F]" />
                Aktivt Par
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[#5B9A6F]" />
                    <div>
                      <span className="font-medium">{activePair.primary_instrument?.name}</span>
                      {activePair.primary_instrument?.current_price && (
                        <span className="ml-2 text-sm font-mono text-muted-foreground">
                          {activePair.primary_instrument.current_price.toFixed(2)} SEK
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-muted-foreground">+</span>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-[#9A5B5B]" />
                    <div>
                      <span className="font-medium">{activePair.counterweight_instrument?.name}</span>
                      {activePair.counterweight_instrument?.current_price && (
                        <span className="ml-2 text-sm font-mono text-muted-foreground">
                          {activePair.counterweight_instrument.current_price.toFixed(2)} SEK
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Correlation Analysis */}
        {selectedPair && (
          <CorrelationAnalysis pair={selectedPair} />
        )}

        {/* Instrument Summary with Prices */}
        {!isLoading && !error && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#5B9A6F]" />
                  BULL Instrument ({bullInstruments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bullInstruments.map((inst) => (
                    <InstrumentRow key={inst.id} inst={inst} />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-[#9A5B5B]" />
                  BEAR Instrument ({bearInstruments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bearInstruments.map((inst) => (
                    <InstrumentRow key={inst.id} inst={inst} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Matched Pairs */}
        {!isLoading && !error && pairs && pairs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Matchade Par</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pairs.map((pair) => (
                <Card
                  key={pair.id}
                  className={`cursor-pointer transition-colors hover:border-primary/50 ${
                    pair.recommended ? "border-amber-500/50" : ""
                  } ${selectedPair?.id === pair.id ? "border-primary ring-1 ring-primary" : ""}`}
                  onClick={() => setSelectedPair(selectedPair?.id === pair.id ? null : pair)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {pair.recommended && (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        )}
                        <Badge
                          variant="outline"
                          className={
                            (pair.correlation_score || 0) >= 90
                              ? "border-[#5B9A6F] text-[#5B9A6F]"
                              : "border-muted-foreground"
                          }
                        >
                          {pair.correlation_score?.toFixed(0)}% match
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {activePair?.primary_instrument_id === pair.bull_instrument_id && (
                          <Check className="h-4 w-4 text-[#5B9A6F]" />
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectPair(pair);
                          }}
                        >
                          Välj
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-[#5B9A6F]" />
                          <span className="text-sm font-medium truncate max-w-[120px]">
                            {pair.bull_instrument?.name}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatPrice(pair.bull_instrument?.current_price || null)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-[#9A5B5B]" />
                          <span className="text-sm font-medium truncate max-w-[120px]">
                            {pair.bear_instrument?.name}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatPrice(pair.bear_instrument?.current_price || null)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                      {pair.leverage_match && <span>✓ Hävstång</span>}
                      {pair.issuer_match && <span>✓ Utgivare</span>}
                      {pair.hedge_efficiency && (
                        <span>Hedge: {pair.hedge_efficiency.toFixed(0)}%</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
