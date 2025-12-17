# Teknisk specifikation: RecycleX (Bull & Bear)

**Version 2.0 | Brentix Automation System**

---

## 1. Systemöversikt

RecycleX är en automatiserad handelsstrategi som exekverar köp- och säljcykler baserat på procentuella prisrörelser från ett referenspris. Systemet finns i två **separata** varianter som aktiveras oberoende av varandra:

| Variant | Certifikattyp | Vinstlogik |
|---------|---------------|------------|
| **RecycleX Bull** | Bull-certifikat | Vinst vid prisuppgång |
| **RecycleX Bear** | Bear-certifikat (inverterat) | Vinst vid prisnedgång |

### 1.1 Oberoende aktivering

**RecycleX Bull och RecycleX Bear är helt separata regler:**
- Aktivering av en variant aktiverar **INTE** automatiskt den andra
- Varje variant har egen konfiguration, kapital och status
- Vid aktivering av en variant **föreslår systemet** aktivering av motstående variant:
  - Om Bull aktiveras → "Vill du även aktivera RecycleX Bear?"
  - Om Bear aktiveras → "Vill du även aktivera RecycleX Bull?"
- Förslaget inkluderar rekommenderade inställningar baserat på aktuellt marknadspris

### 1.2 Certifikatbeteende

**Bull-certifikat:** Certifikatets värde stiger när underliggande tillgång stiger.

**Bear-certifikat (inverterat):** Certifikatets värde stiger när underliggande tillgång sjunker. Detta innebär att:
- Köp sker när certifikatpriset är lågt (underliggande hög)
- Sälj sker när certifikatpriset är högt (underliggande låg)
- Vinst = `(sellPrice - buyPrice) × quantity` (samma formel som Bull)

### 1.3 Standardvärden och motivering

| Parameter | Default | Justerbar | Motivering |
|-----------|---------|-----------|------------|
| targetPercent | 25.71% | ✅ Ja | Baserat på historisk volatilitetsanalys av Brent-olja. Vid hävstång 5x motsvarar detta ~5.14% rörelse i underliggande. Användaren kan ställa in valfritt värde. |
| stopLossPercent | 10% | ✅ Ja | Begränsar maximal förlust per cykel till 10% av investerat kapital. |
| targetCycles | 28 | ✅ Ja | En månad med dagliga cykler (20 handelsdagar + marginal). |

### 1.4 Parallella regler

Flera RecycleX-regler kan köras samtidigt på samma instrument. Systemet hanterar detta genom:
- Unika regel-ID:n
- Separata positionslistor per regel
- Aggregerad kapitalöversikt i dashboard

**Varning:** Användaren ansvarar för att totalt allokerat kapital inte överstiger tillgängligt kapital.

---

## 2. Startlägen

RecycleX stödjer två startlägen som bestäms vid regelns skapande:

### 2.1 Automatisk start (AUTO)

Regeln startar automatiskt när priset når en fördefinierad nivå.

```typescript
{
    startMode: "AUTO",
    autoStartPrice: 1.75,           // Pris som triggar start
    autoStartTolerance: 0.2         // % tolerans (default 0.2%)
}
```

**Beteende:**
1. Regel skapas med status `WAITING`
2. Systemet övervakar priset kontinuerligt
3. När `|currentPrice - autoStartPrice| / autoStartPrice <= tolerance`:
   - Regel aktiveras automatiskt
   - `referencePrice` sätts till `currentPrice`
   - Första cykeln startar omedelbart
4. Cyklerna fortsätter automatiskt enligt `cycleRestartMode`

### 2.2 Manuell start (MANUAL)

Användaren startar regeln manuellt när som helst.

```typescript
{
    startMode: "MANUAL",
    autoStartPrice: null            // Ej relevant för manuell start
}
```

**Beteende:**
1. Regel skapas med status `INACTIVE`
2. Användaren klickar "Starta" i UI eller anropar `/start` API
3. Användaren kan valfritt ange ett specifikt `referencePrice`
4. Om inget pris anges används aktuellt marknadspris
5. Första cykeln startar omedelbart
6. Efterföljande cykler hanteras enligt `cycleRestartMode`

### 2.3 Cykelåterstart efter avslutad cykel

Oavsett startläge hanteras efterföljande cykler av `cycleRestartMode`:

| Läge | Beskrivning |
|------|-------------|
| `CURRENT_PRICE` | Starta nästa cykel omedelbart med aktuellt pris som referens |
| `WAIT_FOR_REFERENCE` | Vänta tills priset återvänder till ursprungligt referenspris (inom tolerans) |
| `ADJUSTED` | Använd föregående cykels target-pris som nytt referenspris |

---

## 3. Datamodell

### 3.1 Regelobjekt: `RecycleXRule`

```typescript
interface RecycleXRule {
    id: string                     // Unikt regel-ID (format: "rx_[uuid]")
    name: string                   // Användardefinierat namn
    type: "BULL" | "BEAR"          // Regelvariant (aktiveras separat)
    status: "INACTIVE" | "WAITING" | "ACTIVE" | "COMPLETED" | "STOPPED" | "PAUSED"

    // Konfiguration
    config: {
        referencePrice: number     // Referenspris (köpkurs för varje cykel)
        capital: number            // Initialt kapital att investera
        orderCount: number         // Antal ordrar (default: 1)
        orderSpread: number        // % mellan ordrar (default: 0, samma nivå)

        // Vinstmål - default 25.71% men användaren kan ställa in annat värde
        targetPercent: number      // Vinstmål i % (default: 25.71, range: 0.01-100)
        stopLossPercent: number    // Stop-loss i % (default: 10)
        targetCycles: number       // Antal cykler innan stopp (default: 28)

        // Kapitalhantering
        capitalMode: "COMPOUND" | "FIXED"  // COMPOUND = rulla vinster, FIXED = fast kapital

        // Cykelåterstart
        cycleRestartMode: "CURRENT_PRICE" | "WAIT_FOR_REFERENCE" | "ADJUSTED"
        cycleRestartTolerance: number      // % tolerans för prismatchning (default: 0.2)

        // Avgifter
        feePerTrade: number        // Fast avgift per order i SEK (default: 0)
        feePercent: number         // Procentuell avgift (default: 0)

        // Tidsbegränsningar
        maxCycleDuration: number | null    // Max sekunder per cykel (null = obegränsat)
        closeBeforeMarketClose: boolean    // Stäng innan marknad stänger
        closeBeforeMinutes: number         // Minuter före stängning (default: 15)

        // Priskällor
        priceSource: {
            monitoring: "MID" | "LAST" | "BID" | "ASK"  // För trigger-övervakning
            buyExecution: "ASK" | "MID"                  // För köpexecution
            sellExecution: "BID" | "MID"                 // För säljexecution
        }
    }

    // Startinställning
    startMode: "MANUAL" | "AUTO"
    autoStartPrice: number | null  // Pris för auto-start (krävs om AUTO)
    autoStartTolerance: number     // % tolerans för auto-start (default: 0.2)

    // Tillstånd
    state: {
        currentCycle: number       // Nuvarande cykel (1-indexed)
        completedCycles: number    // Antal avslutade cykler
        totalProfit: number        // Ackumulerad nettovinst/förlust
        totalFees: number          // Ackumulerade avgifter
        currentCapital: number     // Nuvarande kapital (vid COMPOUND)
        initialCapital: number     // Ursprungligt kapital (för FIXED)
        positions: Position[]      // Aktiva positioner
        lastError: string | null   // Senaste felmeddelande
    }

    // Koppling till motpart (för UI-förslag)
    linkedRuleId: string | null    // ID till motsatt Bull/Bear-regel om skapad

    // Metadata
    createdAt: timestamp
    updatedAt: timestamp

    // Historik
    history: CycleRecord[]
}
```

### 3.2 Positionsobjekt: `Position`

```typescript
interface Position {
    id: string                     // Unikt positions-ID
    orderIndex: number             // Vilken del av kapitalet (1, 2, 3...)

    // Priser
    expectedBuyPrice: number       // Förväntat köppris (referenspris ± spread)
    actualBuyPrice: number | null  // Faktiskt köppris efter execution
    quantity: number               // Antal certifikat
    investedAmount: number         // Investerat belopp

    status: "PENDING" | "OPEN" | "CLOSING" | "CLOSED"

    // Beräknade gränser (baserat på actualBuyPrice när tillgängligt)
    targetPrice: number            // Sälj vid vinst
    stopLossPrice: number          // Sälj vid förlust

    // Execution-detaljer
    buyOrderId: string | null
    sellOrderId: string | null
    buyFilledAt: timestamp | null
    sellFilledAt: timestamp | null

    // Resultat (när stängd)
    sellPrice: number | null
    grossProfit: number | null     // Före avgifter
    fees: number | null            // Totala avgifter för positionen
    netProfit: number | null       // Efter avgifter
    closedReason: "TARGET" | "STOPLOSS" | "TIMEOUT" | "MARKET_CLOSE" | "MANUAL" | null
}
```

### 3.3 Cykelhistorik: `CycleRecord`

```typescript
interface CycleRecord {
    cycleNumber: number
    startTime: timestamp
    endTime: timestamp
    startCapital: number
    endCapital: number
    grossProfit: number
    fees: number
    netProfit: number
    profitPercent: number          // Baserat på nettovinst
    result: "WIN" | "LOSS" | "TIMEOUT" | "MANUAL"
    positions: Position[]          // Snapshot av positioner
    referencePrice: number         // Referenspris för cykeln
}
```

### 3.4 Förslag om motpart: `CounterpartSuggestion`

```typescript
interface CounterpartSuggestion {
    triggeredBy: string            // Regel-ID som triggade förslaget
    suggestedType: "BULL" | "BEAR" // Föreslagen typ (motsatsen)
    suggestedConfig: {
        referencePrice: number     // Baserat på aktuellt marknadspris
        capital: number            // Samma som ursprungsregeln
        targetPercent: number      // Samma som ursprungsregeln
        stopLossPercent: number    // Samma som ursprungsregeln
    }
    message: string                // Förklarande meddelande
    createdAt: timestamp
    dismissed: boolean             // Om användaren avfärdat förslaget
}
```

### 3.5 Dataretention

| Datatyp | Retention |
|---------|-----------|
| Aktiva regler | Permanent |
| Avslutade regler (COMPLETED/STOPPED) | 2 år |
| Cykelhistorik | 2 år |
| Detaljerade positionsloggar | 90 dagar |
| Motpart-förslag | 7 dagar |

---

## 4. Prisberäkningar

### 4.1 RecycleX Bull

```
// Grundberäkning från referenspris
targetPrice = referencePrice × (1 + targetPercent / 100)
stopLossPrice = referencePrice × (1 - stopLossPercent / 100)

// Efter execution: omräkning baserat på faktiskt köppris
actualTargetPrice = actualBuyPrice × (1 + targetPercent / 100)
actualStopLossPrice = actualBuyPrice × (1 - stopLossPercent / 100)

// Exempel: referencePrice = 1.75, targetPercent = 25.71, stopLossPercent = 10
// targetPrice = 1.75 × 1.2571 = 2.20
// stopLossPrice = 1.75 × 0.90 = 1.575

// Med anpassat targetPercent = 15%:
// targetPrice = 1.75 × 1.15 = 2.0125
```

### 4.2 RecycleX Bear

```
// För inverterade Bear-certifikat:
// Certifikatpriset STIGER när underliggande SJUNKER
// Därför: target = högre pris, stoploss = lägre pris

targetPrice = referencePrice × (1 + targetPercent / 100)
stopLossPrice = referencePrice × (1 - stopLossPercent / 100)

// OBS: Samma formel som Bull eftersom certifikatet är inverterat!
// Skillnaden är i vilken riktning vi förväntar oss att underliggande rör sig.

// Exempel: referencePrice = 1.75, targetPercent = 25.71, stopLossPercent = 10
// targetPrice = 1.75 × 1.2571 = 2.20 (certifikat stiger = underliggande sjunker)
// stopLossPrice = 1.75 × 0.90 = 1.575 (certifikat sjunker = underliggande stiger)
```

### 4.3 Vinstberäkning (samma för Bull och Bear)

```
// Eftersom Bear-certifikat är inverterade, är formeln identisk:
grossProfit = (sellPrice - buyPrice) × quantity

// Avgiftsberäkning
buyFees = (investedAmount × feePercent / 100) + feePerTrade
sellFees = (sellPrice × quantity × feePercent / 100) + feePerTrade
totalFees = buyFees + sellFees

// Nettovinst
netProfit = grossProfit - totalFees
```

### 4.4 Order-spread beräkning

När `orderCount > 1` och `orderSpread > 0`:

```
// Bull: Sprider köpordrar nedåt (köper billigare)
for i = 0 to orderCount - 1:
    spreadOffset = (i * orderSpread) / 100
    orderPrice[i] = referencePrice × (1 - spreadOffset)

// Bear: Samma logik (köper certifikatet billigare)
for i = 0 to orderCount - 1:
    spreadOffset = (i * orderSpread) / 100
    orderPrice[i] = referencePrice × (1 - spreadOffset)

// Exempel: referencePrice = 1.75, orderCount = 3, orderSpread = 2
// Order 1: 1.75 × 1.00 = 1.75
// Order 2: 1.75 × 0.98 = 1.715
// Order 3: 1.75 × 0.96 = 1.68
```

---

## 5. Tillståndsmaskin

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│   ┌──────────┐                                                                │
│   │ INACTIVE │ ← Regel skapad med startMode: MANUAL                           │
│   └────┬─────┘                                                                │
│        │                                                                      │
│        │ [Användaren klickar "Starta" / anropar /start API]                   │
│        │                                                                      │
│        ↓                                                                      │
│   ┌──────────┐                                                                │
│   │ WAITING  │ ← Regel skapad med startMode: AUTO (väntar på autoStartPrice)  │
│   └────┬─────┘                                                                │
│        │                                                                      │
│        │ [Pris inom tolerans av autoStartPrice / referencePrice]              │
│        │                                                                      │
│        ↓                                                                      │
│   ┌──────────┐                                                                │
│   │  ACTIVE  │←──────────────────────────────────────────────────────┐        │
│   └────┬─────┘                                                       │        │
│        │                                                             │        │
│        ├──────────────┬──────────────┬──────────────┐                │        │
│        ↓              ↓              ↓              ↓                │        │
│   [Target]      [Stop-loss]    [Timeout]    [Market close]          │        │
│        │              │              │              │                │        │
│        └──────────────┴──────────────┴──────────────┘                │        │
│                       │                                              │        │
│                       ↓                                              │        │
│        ┌─────────────────────────────────┐                           │        │
│        │        Cykel avslutad           │                           │        │
│        │ completedCycles < targetCycles? │                           │        │
│        └──────────────┬──────────────────┘                           │        │
│                       │                                              │        │
│              ┌────────┴────────┐                                     │        │
│              ↓                 ↓                                     │        │
│            [JA]              [NEJ]                                   │        │
│              │                 │                                     │        │
│              │                 ↓                                     │        │
│              │          ┌───────────┐                                │        │
│              │          │ COMPLETED │                                │        │
│              │          └───────────┘                                │        │
│              │                                                       │        │
│              ├─ cycleRestartMode = CURRENT_PRICE ────────────────────┘        │
│              │                                                       │        │
│              ├─ cycleRestartMode = WAIT_FOR_REFERENCE ───→ WAITING ──┘        │
│              │                                                       │        │
│              └─ cycleRestartMode = ADJUSTED ─────────────→ WAITING ──┘        │
│                 (referencePrice = previous targetPrice)                       │
│                                                                               │
│   ┌──────────┐                                                                │
│   │  PAUSED  │←── [Execution-fel efter 3 retries]                             │
│   └────┬─────┘                                                                │
│        │                                                                      │
│        └── [Användaren klickar "Återuppta"] ──────────────────────→ ACTIVE    │
│                                                                               │
│   [Manuell sälj / Avbryt] ──────────────────────────────────→ ┌──────────┐    │
│                                                               │ STOPPED  │    │
│                                                               └──────────┘    │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Händelselogik (Pseudokod)

### 6.1 Prisuppdatering

```typescript
function onPriceUpdate(rule: RecycleXRule, currentPrice: number): void {

    switch (rule.status) {

        case "INACTIVE":
            // Väntar på manuell start - ingen automatisk action
            break

        case "WAITING":
            if (rule.startMode === "AUTO" && rule.state.currentCycle === 0) {
                // Första cykeln - väntar på autoStartPrice
                if (isWithinTolerance(currentPrice, rule.autoStartPrice, rule.autoStartTolerance)) {
                    activateRule(rule, currentPrice)
                }
            } else {
                // Efterföljande cykel - väntar på referenspris
                if (isWithinTolerance(currentPrice, rule.config.referencePrice, rule.config.cycleRestartTolerance)) {
                    startNewCycle(rule, currentPrice)
                }
            }
            break

        case "ACTIVE":
            // Kolla timeout
            if (rule.config.maxCycleDuration !== null) {
                if (cycleExceedsTimeout(rule)) {
                    closeAllPositions(rule, currentPrice, "TIMEOUT")
                    return
                }
            }

            // Kolla market close
            if (rule.config.closeBeforeMarketClose) {
                if (isNearMarketClose(rule.config.closeBeforeMinutes)) {
                    closeAllPositions(rule, currentPrice, "MARKET_CLOSE")
                    return
                }
            }

            // Evaluera positioner
            for (const position of rule.state.positions) {
                if (position.status === "OPEN") {
                    evaluatePosition(rule, position, currentPrice)
                }
            }
            break

        case "PAUSED":
            // Ingen automatisk action, väntar på manuell intervention
            break
    }
}
```

### 6.2 Toleransbaserad prismatchning

```typescript
function isWithinTolerance(currentPrice: number, targetPrice: number, tolerancePercent: number): boolean {
    const tolerance = targetPrice * (tolerancePercent / 100)
    return Math.abs(currentPrice - targetPrice) <= tolerance
}
```

### 6.3 Manuell start

```typescript
function manualStart(rule: RecycleXRule, referencePrice?: number): void {
    if (rule.status !== "INACTIVE") {
        throw new Error("Regel kan endast startas från INACTIVE status")
    }

    const price = referencePrice ?? getCurrentPrice(rule.instrumentId)

    rule.config.referencePrice = price
    rule.state.initialCapital = rule.config.capital
    rule.state.currentCapital = rule.config.capital

    startNewCycle(rule, price)

    // Föreslå motpart
    createCounterpartSuggestion(rule)
}
```

### 6.4 Automatisk aktivering

```typescript
function activateRule(rule: RecycleXRule, currentPrice: number): void {
    rule.config.referencePrice = currentPrice
    rule.state.initialCapital = rule.config.capital
    rule.state.currentCapital = rule.config.capital

    startNewCycle(rule, currentPrice)

    // Föreslå motpart
    createCounterpartSuggestion(rule)
}
```

### 6.5 Föreslå motpart

```typescript
function createCounterpartSuggestion(rule: RecycleXRule): void {
    const counterpartType = rule.type === "BULL" ? "BEAR" : "BULL"
    const currentPrice = getCurrentPrice(getCounterpartInstrument(counterpartType))

    const suggestion: CounterpartSuggestion = {
        triggeredBy: rule.id,
        suggestedType: counterpartType,
        suggestedConfig: {
            referencePrice: currentPrice,
            capital: rule.config.capital,
            targetPercent: rule.config.targetPercent,
            stopLossPercent: rule.config.stopLossPercent
        },
        message: counterpartType === "BEAR"
            ? `Du har aktiverat RecycleX Bull. Vill du även aktivera RecycleX Bear för att handla i båda riktningar? Föreslaget referenspris: ${currentPrice.toFixed(2)} kr`
            : `Du har aktiverat RecycleX Bear. Vill du även aktivera RecycleX Bull för att handla i båda riktningar? Föreslaget referenspris: ${currentPrice.toFixed(2)} kr`,
        createdAt: new Date(),
        dismissed: false
    }

    saveSuggestion(suggestion)
    sendNotification(rule.userId, {
        type: "INFO",
        title: `Förslag: Aktivera RecycleX ${counterpartType}`,
        message: suggestion.message,
        action: {
            label: "Visa förslag",
            url: `/recyclex/suggestions/${suggestion.id}`
        }
    })
}
```

### 6.6 Starta ny cykel

```typescript
function startNewCycle(rule: RecycleXRule, currentPrice: number): void {
    rule.state.currentCycle += 1
    rule.status = "ACTIVE"

    // Bestäm kapital för denna cykel
    const cycleCapital = rule.config.capitalMode === "COMPOUND"
        ? rule.state.currentCapital
        : rule.state.initialCapital

    const capitalPerOrder = cycleCapital / rule.config.orderCount

    for (let i = 0; i < rule.config.orderCount; i++) {
        const position = createPosition(rule, capitalPerOrder, i + 1, currentPrice)
        executeBuyOrder(rule, position)
    }
}

function createPosition(
    rule: RecycleXRule,
    amount: number,
    index: number,
    currentPrice: number
): Position {
    // Beräkna spread-justerat köppris
    const spreadOffset = ((index - 1) * rule.config.orderSpread) / 100
    const expectedBuyPrice = rule.config.referencePrice * (1 - spreadOffset)

    // Beräkna targets baserat på förväntat pris (justeras efter execution)
    // Använder användarens konfigurerade targetPercent (default eller anpassat)
    const targetPrice = expectedBuyPrice * (1 + rule.config.targetPercent / 100)
    const stopLossPrice = expectedBuyPrice * (1 - rule.config.stopLossPercent / 100)

    return {
        id: generatePositionId(),
        orderIndex: index,
        expectedBuyPrice: expectedBuyPrice,
        actualBuyPrice: null,
        quantity: amount / expectedBuyPrice,
        investedAmount: amount,
        status: "PENDING",
        targetPrice: targetPrice,
        stopLossPrice: stopLossPrice,
        buyOrderId: null,
        sellOrderId: null,
        buyFilledAt: null,
        sellFilledAt: null,
        sellPrice: null,
        grossProfit: null,
        fees: null,
        netProfit: null,
        closedReason: null
    }
}
```

### 6.7 Orderexecution med slippage-hantering

```typescript
async function executeBuyOrder(rule: RecycleXRule, position: Position): Promise<void> {
    try {
        const order = await broker.placeBuyOrder({
            instrument: rule.instrumentId,
            amount: position.investedAmount,
            priceType: rule.config.priceSource.buyExecution
        })

        position.buyOrderId = order.id
        position.status = "OPEN"

        // Vänta på fill
        const fill = await broker.waitForFill(order.id)

        // Uppdatera med faktiska värden
        position.actualBuyPrice = fill.price
        position.quantity = fill.quantity
        position.buyFilledAt = fill.timestamp

        // Räkna om targets baserat på faktiskt pris
        recalculateTargets(rule, position)

        rule.state.positions.push(position)

    } catch (error) {
        handleExecutionError(rule, position, error, "BUY")
    }
}

function recalculateTargets(rule: RecycleXRule, position: Position): void {
    const basePrice = position.actualBuyPrice
    // Använder användarens konfigurerade targetPercent
    position.targetPrice = basePrice * (1 + rule.config.targetPercent / 100)
    position.stopLossPrice = basePrice * (1 - rule.config.stopLossPercent / 100)
}
```

### 6.8 Evaluera position

```typescript
function evaluatePosition(rule: RecycleXRule, position: Position, currentPrice: number): void {
    // Samma logik för Bull och Bear (certifikaten är inverterade)
    const targetHit = currentPrice >= position.targetPrice
    const stopLossHit = currentPrice <= position.stopLossPrice

    if (targetHit) {
        closePosition(rule, position, currentPrice, "TARGET")
    } else if (stopLossHit) {
        closePosition(rule, position, currentPrice, "STOPLOSS")
    }
}

async function closePosition(
    rule: RecycleXRule,
    position: Position,
    price: number,
    reason: Position["closedReason"]
): Promise<void> {
    position.status = "CLOSING"

    try {
        const order = await broker.placeSellOrder({
            instrument: rule.instrumentId,
            quantity: position.quantity,
            priceType: rule.config.priceSource.sellExecution
        })

        position.sellOrderId = order.id

        const fill = await broker.waitForFill(order.id)

        position.sellPrice = fill.price
        position.sellFilledAt = fill.timestamp
        position.closedReason = reason
        position.status = "CLOSED"

        // Beräkna vinst/förlust
        calculatePositionProfit(rule, position)

        // Uppdatera regelns kapital
        updateRuleCapital(rule, position)

        // Kolla om alla positioner stängda
        if (allPositionsClosed(rule)) {
            completeCycle(rule)
        }

    } catch (error) {
        handleExecutionError(rule, position, error, "SELL")
    }
}

function calculatePositionProfit(rule: RecycleXRule, position: Position): void {
    // Gross profit (samma formel för Bull och Bear)
    position.grossProfit = (position.sellPrice - position.actualBuyPrice) * position.quantity

    // Avgifter
    const buyFees = (position.investedAmount * rule.config.feePercent / 100) + rule.config.feePerTrade
    const sellValue = position.sellPrice * position.quantity
    const sellFees = (sellValue * rule.config.feePercent / 100) + rule.config.feePerTrade
    position.fees = buyFees + sellFees

    // Nettovinst
    position.netProfit = position.grossProfit - position.fees
}

function updateRuleCapital(rule: RecycleXRule, position: Position): void {
    // Lägg tillbaka investerat kapital plus/minus vinst/förlust
    rule.state.currentCapital += position.investedAmount + position.netProfit
    rule.state.totalProfit += position.netProfit
    rule.state.totalFees += position.fees
}
```

### 6.9 Avsluta cykel

```typescript
function completeCycle(rule: RecycleXRule): void {
    // Skapa historikpost
    const cycleRecord = createCycleRecord(rule)
    rule.history.push(cycleRecord)

    rule.state.completedCycles += 1

    // Kontrollera om alla cykler klara
    if (rule.state.completedCycles >= rule.config.targetCycles) {
        rule.status = "COMPLETED"
        return
    }

    // Bestäm nästa steg baserat på cycleRestartMode
    switch (rule.config.cycleRestartMode) {
        case "CURRENT_PRICE":
            // Starta direkt med nuvarande pris som referens
            const currentPrice = getCurrentPrice(rule.instrumentId)
            rule.config.referencePrice = currentPrice
            rule.state.positions = []
            startNewCycle(rule, currentPrice)
            break

        case "WAIT_FOR_REFERENCE":
            // Behåll samma referenspris, vänta på att pris återvänder
            rule.status = "WAITING"
            rule.state.positions = []
            break

        case "ADJUSTED":
            // Sätt referenspris till föregående cykels target
            const lastPosition = rule.state.positions[0]
            rule.config.referencePrice = lastPosition.targetPrice
            rule.status = "WAITING"
            rule.state.positions = []
            break
    }
}

function createCycleRecord(rule: RecycleXRule): CycleRecord {
    const positions = rule.state.positions
    const grossProfit = positions.reduce((sum, p) => sum + (p.grossProfit || 0), 0)
    const fees = positions.reduce((sum, p) => sum + (p.fees || 0), 0)
    const netProfit = grossProfit - fees

    const startCapital = rule.config.capitalMode === "COMPOUND"
        ? rule.state.currentCapital - netProfit
        : rule.state.initialCapital

    return {
        cycleNumber: rule.state.currentCycle,
        startTime: positions[0]?.buyFilledAt || new Date(),
        endTime: new Date(),
        startCapital: startCapital,
        endCapital: startCapital + netProfit,
        grossProfit: grossProfit,
        fees: fees,
        netProfit: netProfit,
        profitPercent: (netProfit / startCapital) * 100,
        result: determineResult(positions),
        positions: [...positions],
        referencePrice: rule.config.referencePrice
    }
}

function determineResult(positions: Position[]): CycleRecord["result"] {
    const reasons = positions.map(p => p.closedReason)

    if (reasons.includes("MANUAL")) return "MANUAL"
    if (reasons.includes("TIMEOUT")) return "TIMEOUT"
    if (reasons.every(r => r === "TARGET")) return "WIN"
    return "LOSS"
}
```

### 6.10 Felhantering

```typescript
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

async function handleExecutionError(
    rule: RecycleXRule,
    position: Position,
    error: Error,
    orderType: "BUY" | "SELL"
): Promise<void> {
    const retryCount = position.retryCount || 0

    if (retryCount < MAX_RETRIES) {
        position.retryCount = retryCount + 1
        await delay(RETRY_DELAY_MS * position.retryCount)

        if (orderType === "BUY") {
            await executeBuyOrder(rule, position)
        } else {
            await closePosition(rule, position, getCurrentPrice(rule.instrumentId), position.closedReason)
        }
    } else {
        // Max retries reached
        rule.status = "PAUSED"
        rule.state.lastError = `${orderType} order failed after ${MAX_RETRIES} retries: ${error.message}`

        await sendNotification(rule.userId, {
            type: "ERROR",
            title: "RecycleX pausad",
            message: `Regel "${rule.name}" har pausats på grund av exekveringsfel.`,
            ruleId: rule.id
        })
    }
}
```

### 6.11 Manuell sälj

```typescript
async function manualSell(rule: RecycleXRule, positionId?: string): Promise<void> {
    const currentPrice = getCurrentPrice(rule.instrumentId)

    if (positionId) {
        const position = rule.state.positions.find(p => p.id === positionId)
        if (position && position.status === "OPEN") {
            await closePosition(rule, position, currentPrice, "MANUAL")
        }
    } else {
        // Sälj alla öppna positioner
        const openPositions = rule.state.positions.filter(p => p.status === "OPEN")
        await Promise.all(
            openPositions.map(p => closePosition(rule, p, currentPrice, "MANUAL"))
        )
    }
}
```

---

## 7. API-gränssnitt

### 7.1 Skapa regel

```
POST /api/recyclex/rules

Request:
{
    "name": "Min Bull-strategi",
    "type": "BULL",
    "startMode": "AUTO",                    // "AUTO" eller "MANUAL"
    "autoStartPrice": 1.75,                 // Krävs om startMode = AUTO
    "autoStartTolerance": 0.2,              // % tolerans för auto-start
    "config": {
        "capital": 10000,
        "orderCount": 1,
        "orderSpread": 0,
        "targetPercent": 25.71,             // Default 25.71%, användaren kan ändra
        "stopLossPercent": 10,
        "targetCycles": 28,
        "capitalMode": "COMPOUND",
        "cycleRestartMode": "CURRENT_PRICE",
        "cycleRestartTolerance": 0.2,
        "feePerTrade": 39,
        "feePercent": 0,
        "maxCycleDuration": null,
        "closeBeforeMarketClose": true,
        "closeBeforeMinutes": 15,
        "priceSource": {
            "monitoring": "LAST",
            "buyExecution": "ASK",
            "sellExecution": "BID"
        }
    }
}

Response:
{
    "id": "rx_abc123",
    "status": "WAITING",                    // WAITING om AUTO, INACTIVE om MANUAL
    "createdAt": "2024-01-15T10:30:00Z",
    ...
}
```

### 7.2 Manuell start (endast för startMode: MANUAL)

```
POST /api/recyclex/rules/{id}/start

Request:
{
    "referencePrice": 1.80                  // Valfritt, annars används aktuellt pris
}

Response:
{
    "id": "rx_abc123",
    "status": "ACTIVE",
    "state": {
        "currentCycle": 1,
        "positions": [...]
    },
    "counterpartSuggestion": {              // Förslag om motpart
        "id": "sug_xyz789",
        "suggestedType": "BEAR",
        "suggestedConfig": {...},
        "message": "Vill du även aktivera RecycleX Bear?"
    }
}
```

### 7.3 Acceptera motpart-förslag

```
POST /api/recyclex/suggestions/{id}/accept

Request:
{
    "modifications": {                      // Valfria justeringar
        "capital": 5000,                    // Kan använda annat kapital
        "targetPercent": 20                 // Kan använda annan target
    }
}

Response:
{
    "createdRule": {
        "id": "rx_def456",
        "type": "BEAR",
        "status": "WAITING",
        ...
    },
    "linkedTo": "rx_abc123"
}
```

### 7.4 Avfärda motpart-förslag

```
POST /api/recyclex/suggestions/{id}/dismiss

Response:
{
    "dismissed": true
}
```

### 7.5 Manuell sälj

```
POST /api/recyclex/rules/{id}/sell

Request:
{
    "positionId": "pos_123"                 // Valfritt, annars säljs alla
}

Response:
{
    "sold": ["pos_123"],
    "totalProfit": 245.50
}
```

### 7.6 Pausa regel

```
POST /api/recyclex/rules/{id}/pause

Response:
{
    "id": "rx_abc123",
    "status": "PAUSED",
    "openPositions": 2
}
```

### 7.7 Återuppta regel

```
POST /api/recyclex/rules/{id}/resume

Response:
{
    "id": "rx_abc123",
    "status": "ACTIVE"
}
```

### 7.8 Avbryt regel

```
POST /api/recyclex/rules/{id}/stop

Request:
{
    "closePositions": true                  // Om true, sälj alla öppna positioner
}

Response:
{
    "id": "rx_abc123",
    "status": "STOPPED",
    "finalCapital": 12500,
    "totalProfit": 2500
}
```

### 7.9 Hämta status

```
GET /api/recyclex/rules/{id}

Response:
{
    "id": "rx_abc123",
    "name": "Min Bull-strategi",
    "type": "BULL",
    "status": "ACTIVE",
    "startMode": "AUTO",
    "config": {
        "targetPercent": 25.71,             // Visar aktuellt värde (default eller anpassat)
        ...
    },
    "state": {
        "currentCycle": 3,
        "completedCycles": 2,
        "totalProfit": 1580.25,
        "totalFees": 234.00,
        "currentCapital": 11580.25,
        "initialCapital": 10000,
        "positions": [...]
    },
    "linkedRuleId": "rx_def456",            // Om motpart-regel skapats
    "history": [...]
}
```

### 7.10 Lista regler

```
GET /api/recyclex/rules?status=ACTIVE&type=BULL

Response:
{
    "rules": [...],
    "pagination": {
        "total": 5,
        "page": 1,
        "pageSize": 20
    }
}
```

### 7.11 Hämta motpart-förslag

```
GET /api/recyclex/suggestions?dismissed=false

Response:
{
    "suggestions": [
        {
            "id": "sug_xyz789",
            "triggeredBy": "rx_abc123",
            "suggestedType": "BEAR",
            "suggestedConfig": {...},
            "message": "...",
            "createdAt": "2024-01-15T10:30:00Z",
            "dismissed": false
        }
    ]
}
```

---

## 8. Valideringsregler

| Parameter | Validering | Felmeddelande |
|-----------|------------|---------------|
| name | 1-100 tecken | "Namn måste vara 1-100 tecken" |
| type | "BULL" \| "BEAR" | "Ogiltig regeltyp" |
| startMode | "MANUAL" \| "AUTO" | "Ogiltigt startläge" |
| capital | > 0 | "Kapital måste vara större än 0" |
| orderCount | >= 1, heltal, <= 10 | "Antal ordrar måste vara 1-10" |
| orderSpread | >= 0, <= 20 | "Order-spread måste vara 0-20%" |
| targetPercent | > 0, <= 100 | "Vinstmål måste vara 0.01-100%" |
| stopLossPercent | > 0, <= 100 | "Stop-loss måste vara 0.01-100%" |
| targetCycles | >= 1, heltal, <= 1000 | "Antal cykler måste vara 1-1000" |
| cycleRestartTolerance | > 0, <= 5 | "Tolerans måste vara 0.01-5%" |
| autoStartPrice | > 0 (krävs om AUTO) | "Auto-startpris måste vara större än 0" |
| autoStartTolerance | > 0, <= 5 | "Auto-start tolerans måste vara 0.01-5%" |
| referencePrice | > 0 | "Referenspris måste vara större än 0" |
| feePerTrade | >= 0 | "Avgift per trade kan inte vara negativ" |
| feePercent | >= 0, <= 10 | "Procentuell avgift måste vara 0-10%" |
| maxCycleDuration | null \| > 60 | "Tidsgräns måste vara minst 60 sekunder" |
| closeBeforeMinutes | 1-60 | "Stängningstid måste vara 1-60 minuter" |

---

## 9. Felhantering

| Scenario | Åtgärd | Status |
|----------|--------|--------|
| Köporder misslyckas (1-2 försök) | Automatisk retry efter 1-2 sekunder | ACTIVE |
| Köporder misslyckas (3 försök) | Pausa regel, notifiera användare | PAUSED |
| Säljorder misslyckas (1-2 försök) | Automatisk retry efter 1-2 sekunder | ACTIVE |
| Säljorder misslyckas (3 försök) | Pausa regel, notifiera användare | PAUSED |
| Pris ej tillgängligt (< 5 min) | Behåll senast kända pris | ACTIVE |
| Pris ej tillgängligt (>= 5 min) | Pausa regel, notifiera användare | PAUSED |
| Kapital otillräckligt | Avbryt cykelstart, notifiera användare | PAUSED |
| Marknad stängd | Vänta på öppning (ingen statusändring) | WAITING/ACTIVE |
| Oväntad systemfel | Logga, pausa, notifiera | PAUSED |

---

## 10. Notifikationer

### 10.1 Notifikationstyper

| Händelse | Typ | Prioritet |
|----------|-----|-----------|
| Regel aktiverad (auto-start) | INFO | Normal |
| Cykel startad | INFO | Låg |
| Position såld (vinst) | SUCCESS | Normal |
| Position såld (stop-loss) | WARNING | Normal |
| Position såld (timeout) | WARNING | Normal |
| Cykel avslutad | INFO | Normal |
| Alla cykler avslutade | SUCCESS | Hög |
| Regel pausad (fel) | ERROR | Hög |
| Kapital otillräckligt | ERROR | Hög |
| Motpart-förslag | INFO | Normal |

### 10.2 Notifikationsformat

```typescript
interface Notification {
    id: string
    userId: string
    ruleId: string
    type: "INFO" | "SUCCESS" | "WARNING" | "ERROR"
    priority: "LOW" | "NORMAL" | "HIGH"
    title: string
    message: string
    data: {
        cycleNumber?: number
        profit?: number
        positionId?: string
        reason?: string
        suggestionId?: string
    }
    action?: {
        label: string
        url: string
    }
    read: boolean
    createdAt: timestamp
}
```

### 10.3 Leveranskanaler

- **In-app:** Alltid
- **Push-notifikation:** HIGH priority
- **E-post:** ERROR-typer (konfigurerbart)

---

## 11. Prestandakrav

| Mått | Krav |
|------|------|
| Prisuppdateringslatens | < 100ms |
| Orderexecution latens | < 500ms |
| Max samtidiga regler per användare | 50 |
| Max positioner per regel | 10 |
| Historiklagring | 1000 cykler per regel |

---

## 12. Säkerhet

- Alla API-anrop kräver autentisering (JWT)
- Rate limiting: 100 requests/minut per användare
- Audit logging av alla regeländringar
- Känslig data (API-nycklar) krypteras i vila
- HTTPS obligatoriskt

---

## Ändringslogg

| Version | Datum | Ändringar |
|---------|-------|-----------|
| 1.0 | - | Initial specifikation |
| 2.0 | 2024-01-15 | **Nya funktioner:** avgiftshantering, slippage, toleransbaserad prismatchning, cycleRestartMode, capitalMode, orderSpread, tidsbegränsningar, PAUSED-status, priceSource-konfiguration, motpart-förslag. **Förtydliganden:** Bear-certifikatbeteende, standardvärden (targetPercent 25.71% justerbar), parallella regler, dataretention, separata startlägen (AUTO/MANUAL), oberoende Bull/Bear-aktivering. |
