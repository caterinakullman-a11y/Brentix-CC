import { MainLayout } from "@/components/layout/MainLayout";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { TechnicalIndicators } from "@/components/dashboard/TechnicalIndicators";
import { useTechnicalIndicators } from "@/hooks/useTechnicalIndicators";
import { usePriceData } from "@/hooks/usePriceData";

const Analysis = () => {
  const { indicators, isLoading: indicatorsLoading } = useTechnicalIndicators();
  const { currentPrice, isLoading: priceLoading } = usePriceData();

  const isLoading = indicatorsLoading || priceLoading;
  const hasData = !!indicators && currentPrice > 0;

  // Beräkna RSI-status och trend för sammanfattning
  const rsi = indicators?.rsi_14 ?? 0;
  const macd = indicators?.macd ?? 0;
  const macdSignal = indicators?.macd_signal ?? 0;
  const sma5 = indicators?.sma_5 ?? 0;
  const sma20 = indicators?.sma_20 ?? 0;
  const bollingerLower = indicators?.bollinger_lower ?? 0;
  const bollingerUpper = indicators?.bollinger_upper ?? 0;

  const rsiStatus = rsi < 30 ? "översåld" : rsi > 70 ? "överköpt" : "neutral";
  const macdStatus = macd > macdSignal ? "positiv crossover" : "negativ crossover";
  const trendStatus = sma5 > sma20 ? "positiv" : sma5 < sma20 ? "negativ" : "sidledes";
  const bias = rsi < 45 ? "hausse" : rsi > 55 ? "baisse" : "neutral";

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teknisk Analys</h1>
          <p className="text-sm text-muted-foreground">
            Djupgående marknadsanalys och indikatorer
          </p>
        </div>

        <PriceChart />

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Indikatorer</h2>
          <TechnicalIndicators
            rsi={rsi}
            macd={macd}
            macdSignal={macdSignal}
            bollingerUpper={bollingerUpper}
            bollingerMiddle={indicators?.bollinger_middle ?? 0}
            bollingerLower={bollingerLower}
            sma5={sma5}
            sma20={sma20}
            currentPrice={currentPrice}
            isLoading={isLoading}
            hasData={hasData}
          />
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Marknadssammanfattning</h2>
          <div className="prose prose-invert max-w-none">
            {hasData ? (
              <>
                <p className="text-muted-foreground">
                  Brent Crude handlas just nu till <span className="text-foreground font-mono font-semibold">${currentPrice.toFixed(2)}</span> med en {bias} bias.
                  RSI på {rsi.toFixed(1)} indikerar {rsiStatus} läge, medan MACD visar en {macdStatus}.
                  Priset handlas {currentPrice > bollingerUpper ? "över övre" : currentPrice < bollingerLower ? "under nedre" : "inom"} Bollinger Bands,
                  vilket indikerar {currentPrice > bollingerUpper || currentPrice < bollingerLower ? "hög" : "normal"} volatilitet.
                </p>
                <p className="text-muted-foreground mt-4">
                  Stödnivåer finns vid ${bollingerLower.toFixed(2)} och ${(bollingerLower * 0.99).toFixed(2)},
                  medan motstånd finns vid ${bollingerUpper.toFixed(2)}.
                  Den kortsiktiga trenden är {trendStatus} med SMA5 {sma5 > sma20 ? "över" : sma5 < sma20 ? "under" : "lika med"} SMA20.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                {isLoading ? "Laddar marknadsdata..." : "Ingen marknadsdata tillgänglig. Väntar på datainsamling..."}
              </p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Analysis;
