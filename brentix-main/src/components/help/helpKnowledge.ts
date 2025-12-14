// Brentix Help Knowledge Base
// Contains all help topics, answers, and matching logic

export interface HelpTopic {
  id: string;
  category: "indicators" | "trading" | "settings" | "safety" | "general";
  question: string;
  keywords: string[];
  answer: string;
  shortLabel?: string;
  relatedIds?: string[];
}

export const HELP_KNOWLEDGE_BASE: HelpTopic[] = [
  // ===== TEKNISKA INDIKATORER =====
  {
    id: "rsi",
    category: "indicators",
    question: "Vad är RSI?",
    keywords: ["rsi", "relative strength", "relativ styrka", "översåld", "överköpt", "oversold", "overbought"],
    shortLabel: "RSI",
    answer: `**RSI (Relative Strength Index)** är en momentumindikator som mäter hastigheten och förändringen av prisrörelser.

📊 **Hur det fungerar:**
• RSI visas som ett värde mellan 0-100
• **Under 30** = Översåld (potentiell köpsignal)
• **Över 70** = Överköpt (potentiell säljsignal)
• **30-70** = Neutral zon

🎯 **I Brentix:**
Vi använder RSI(14), vilket betyder att vi tittar på de senaste 14 prisobservationerna. När RSI går under 30 genereras ofta en KÖP-signal, och över 70 en SÄLJ-signal.

💡 **Tips:** RSI fungerar bäst i kombination med andra indikatorer som MACD.`,
    relatedIds: ["macd", "signals", "indicators-combo"],
  },
  {
    id: "macd",
    category: "indicators",
    question: "Vad är MACD?",
    keywords: ["macd", "moving average convergence", "histogram", "signal line", "ema"],
    shortLabel: "MACD",
    answer: `**MACD (Moving Average Convergence Divergence)** visar förhållandet mellan två glidande medelvärden.

📊 **Komponenter:**
• **MACD-linje** = EMA(12) - EMA(26)
• **Signal-linje** = EMA(9) av MACD-linjen
• **Histogram** = MACD - Signal

🎯 **Signaler:**
• **Bullish crossover**: MACD korsar uppåt genom signal-linjen → KÖP
• **Bearish crossover**: MACD korsar nedåt genom signal-linjen → SÄLJ
• **Divergens**: När pris och MACD går åt olika håll

💡 **I Brentix:**
MACD-signaler kombineras med RSI för starkare signaler. En KÖP-signal med både RSI < 30 OCH bullish MACD-korsning blir en "STARK" signal.`,
    relatedIds: ["rsi", "signals", "ema"],
  },
  {
    id: "bollinger",
    category: "indicators",
    question: "Vad är Bollinger Bands?",
    keywords: ["bollinger", "band", "bands", "standardavvikelse", "volatilitet", "squeeze"],
    shortLabel: "Bollinger",
    answer: `**Bollinger Bands** är ett volatilitetsband som expanderar och kontraherar baserat på marknadsvolatilitet.

📊 **Tre linjer:**
• **Övre bandet** = SMA(20) + 2 × standardavvikelse
• **Mitten** = SMA(20) (20-dagars glidande medelvärde)
• **Nedre bandet** = SMA(20) - 2 × standardavvikelse

🎯 **Tolkning:**
• **Pris vid övre bandet** → Potentiellt överköpt
• **Pris vid nedre bandet** → Potentiellt översålt
• **Smala band (squeeze)** → Låg volatilitet, stor rörelse kan komma
• **Breda band** → Hög volatilitet

💡 **I Brentix:**
Vi visar om priset är "Within Bands", "Above Upper" eller "Below Lower" för att ge dig snabb överblick.`,
    relatedIds: ["rsi", "sma", "volatility"],
  },
  {
    id: "sma",
    category: "indicators",
    question: "Vad är SMA?",
    keywords: ["sma", "simple moving average", "glidande medelvärde", "trend", "sma5", "sma20"],
    shortLabel: "SMA",
    answer: `**SMA (Simple Moving Average)** är det enklaste glidande medelvärdet - genomsnittet av de senaste X priserna.

📊 **Vanliga perioder:**
• **SMA(5)** = Kortsiktigt (5 priser)
• **SMA(20)** = Medellång sikt
• **SMA(50)** = Långsiktigt

🎯 **Trendanalys:**
• **SMA(5) > SMA(20)** = Uppåtgående trend (bullish)
• **SMA(5) < SMA(20)** = Nedåtgående trend (bearish)
• **Golden Cross**: När SMA(50) korsar uppåt genom SMA(200) - stark köpsignal
• **Death Cross**: Motsatsen - stark säljsignal

💡 **I Brentix:**
Vi visar trenden som "Uptrend", "Downtrend" eller "Sideways" baserat på SMA(5) vs SMA(20).`,
    relatedIds: ["ema", "trend", "bollinger"],
  },
  {
    id: "ema",
    category: "indicators",
    question: "Vad är EMA?",
    keywords: ["ema", "exponential moving average", "exponentiellt"],
    shortLabel: "EMA",
    answer: `**EMA (Exponential Moving Average)** är ett glidande medelvärde som ger mer vikt åt nyare priser.

📊 **Skillnad mot SMA:**
• SMA behandlar alla priser lika
• EMA reagerar snabbare på prisförändringar
• EMA är mer "responsivt" men kan ge fler falska signaler

🎯 **Användning:**
• EMA(12) och EMA(26) används i MACD
• Kortare EMA = mer känslig
• Längre EMA = mer stabil

💡 **I Brentix:**
EMA används internt för MACD-beräkningar men visas inte separat i dashboarden.`,
    relatedIds: ["macd", "sma"],
  },

  // ===== TRADING =====
  {
    id: "auto-trading",
    category: "trading",
    question: "Hur fungerar auto-trading?",
    keywords: ["auto", "automatisk", "handel", "auto-trading", "toggle", "slå på"],
    shortLabel: "Auto-trading",
    answer: `**Auto-trading** låter Brentix automatiskt exekvera trades baserat på signaler.

⚙️ **Så här fungerar det:**
1. När en KÖP- eller SÄLJ-signal genereras
2. Om auto-trading är PÅ och signalen är tillräckligt stark
3. Skapas en order i kön
4. Edge Function exekverar ordern via Avanza

🔧 **Aktivera:**
• Klicka på "Auto" toggle i headern
• Första gången visas en bekräftelsedialog
• Grön pulsande prick = aktivt

⚠️ **Viktigt:**
• Kräver Avanza-koppling i Inställningar
• Respekterar din positionsstorlek (SEK)
• Nödstopp kan stoppa all handel omedelbart
• Paper trading måste vara AV för riktiga trades`,
    relatedIds: ["paper-trading", "avanza", "signals", "emergency-stop"],
  },
  {
    id: "paper-trading",
    category: "trading",
    question: "Vad är paper trading?",
    keywords: ["paper", "papper", "demo", "övning", "simulering", "fake", "test"],
    shortLabel: "Paper trading",
    answer: `**Paper trading** låter dig öva handel utan att riskera riktiga pengar.

💰 **Fördelar:**
• Testa strategier utan risk
• Lär dig hur appen fungerar
• Se hur signalerna presterar
• Perfekt för nybörjare

📊 **Hur det fungerar:**
• Du får 100 000 SEK virtuellt startkapital
• Alla trades loggas separat från riktiga trades
• Du kan se din paper trading-prestanda
• Påverkar inte ditt Avanza-konto

🔧 **Aktivera/Avaktivera:**
Gå till **Inställningar → Paper Trading** och slå av/på.

💡 **Tips:** Kör paper trading i minst 2 veckor innan du går live!`,
    relatedIds: ["auto-trading", "settings", "performance"],
  },
  {
    id: "signals",
    category: "trading",
    question: "Hur fungerar signalerna?",
    keywords: ["signal", "signaler", "köp", "sälj", "hold", "avvakta", "stark", "svag"],
    shortLabel: "Signaler",
    answer: `**Signaler** genereras automatiskt baserat på tekniska indikatorer.

📊 **Tre typer:**
• 🟢 **KÖP** - Indikatorer pekar uppåt
• 🔴 **SÄLJ** - Indikatorer pekar nedåt  
• 🟡 **AVVAKTA (HOLD)** - Inget tydligt läge

💪 **Styrka:**
• **STARK** - Flera indikatorer samstämmiga (RSI + MACD)
• **MODERAT** - En indikator ger signal
• **SVAG** - Svag indikation

🎯 **Konfidensgrad:**
Visar i procent hur säker signalen är (baserat på probability up/down).

⚡ **Exekvering:**
• Manuellt: Klicka "Exekvera Trade"
• Automatiskt: Om auto-trading är på`,
    relatedIds: ["rsi", "macd", "auto-trading", "confidence"],
  },
  {
    id: "stop-loss",
    category: "trading",
    question: "Hur sätter jag stop-loss?",
    keywords: ["stop", "loss", "stoploss", "stop-loss", "förlust", "skydd", "risk"],
    shortLabel: "Stop-loss",
    answer: `**Stop-loss** är en automatisk säljorder som begränsar din förlust.

📊 **Så fungerar det:**
• Du anger en procent (t.ex. 2%)
• Om priset faller 2% från entry → position stängs automatiskt
• Skyddar mot stora förluster

🔧 **Ställ in:**
Gå till **Inställningar → Stop-loss percent** och ange önskat värde.

💡 **Rekommendation:**
• **Konservativt:** 1-2%
• **Normalt:** 2-3%
• **Aggressivt:** 3-5%

⚠️ **Kom ihåg:**
• För tajt stop-loss = stoppas ut för ofta
• För vid stop-loss = större förluster
• Anpassa efter volatilitet`,
    relatedIds: ["take-profit", "trailing-stop", "risk-management"],
  },
  {
    id: "take-profit",
    category: "trading",
    question: "Vad är take-profit?",
    keywords: ["take", "profit", "takeprofit", "take-profit", "vinst", "mål", "target"],
    shortLabel: "Take-profit",
    answer: `**Take-profit** är en automatisk säljorder som säkrar din vinst.

📊 **Så fungerar det:**
• Du anger en procent (t.ex. 1%)
• Om priset stiger 1% från entry → position stängs automatiskt
• Säkrar vinsten innan marknaden vänder

🔧 **Ställ in:**
Gå till **Inställningar → Take-profit percent** och ange önskat värde.

💡 **Risk/Reward-ratio:**
• Stop-loss 2% + Take-profit 1% = 1:0.5 ratio (dåligt)
• Stop-loss 2% + Take-profit 4% = 1:2 ratio (bra)
• Sikta på minst 1:1.5 ratio

⚠️ **Tips:**
Använd trailing stop för att låta vinsten löpa!`,
    relatedIds: ["stop-loss", "trailing-stop", "risk-management"],
  },
  {
    id: "trailing-stop",
    category: "trading",
    question: "Vad är en trailing stop?",
    keywords: ["trailing", "stop", "rörlig", "dynamisk", "följande"],
    shortLabel: "Trailing stop",
    answer: `**Trailing stop** är en dynamisk stop-loss som följer med priset uppåt.

📊 **Hur det fungerar:**
1. Du sätter en trailing percent (t.ex. 1.5%)
2. Om priset stiger följer stop-nivån med
3. Om priset faller 1.5% från toppen → triggas stop

🎯 **Exempel:**
• Entry: $74.00
• Trailing: 1.5%
• Pris stiger till $76.00 → Stop flyttas till $74.86
• Pris faller till $74.86 → Position stängs

💡 **Fördelar:**
• Låter vinsten löpa
• Skyddar automatiskt vinst
• Bättre än fast take-profit i trender

🔧 **Skapa:**
Gå till **Säkerhet → Villkorliga Ordrar → Ny Order** och välj "Trailing Stop".`,
    relatedIds: ["stop-loss", "conditional-orders", "take-profit"],
  },

  // ===== INSTÄLLNINGAR =====
  {
    id: "avanza",
    category: "settings",
    question: "Hur kopplar jag Avanza?",
    keywords: ["avanza", "koppling", "konto", "broker", "api", "anslut", "connect"],
    shortLabel: "Avanza",
    answer: `**Avanza-koppling** låter Brentix handla direkt på ditt konto.

🔧 **Steg för steg:**

**1. I Avanza:**
• Aktivera tvåfaktorsautentisering (TOTP)
• Notera ditt konto-ID (hittas i URL:en)

**2. I Brentix:**
• Gå till **Inställningar → Avanza**
• Ange ditt konto-ID
• Klicka "Testa anslutning"

**3. Backend (admin):**
• Avanza-användarnamn, lösenord och TOTP-secret måste konfigureras som Edge Function secrets i Supabase

⚠️ **Säkerhet:**
• Dina Avanza-uppgifter sparas ALDRIG i frontend
• Endast server-side Edge Functions har tillgång
• All kommunikation är krypterad

💡 **Tips:** Börja med paper trading först!`,
    relatedIds: ["auto-trading", "paper-trading", "settings"],
  },
  {
    id: "position-size",
    category: "settings",
    question: "Hur stor ska min positionsstorlek vara?",
    keywords: ["position", "storlek", "size", "sek", "kapital", "pengar", "hur mycket"],
    shortLabel: "Position",
    answer: `**Positionsstorlek** avgör hur mycket pengar du sätter i varje trade.

📊 **Rekommendationer:**
• **Max 10%** av totalt kapital per position
• **2-5%** för konservativ handel
• **5-10%** för mer aggressiv handel

🎯 **Exempel:**
• Kapital: 100 000 SEK
• Position: 5% = 5 000 SEK per trade
• Max samtidiga positioner: ~10-20 st

🔧 **Ställ in:**
Gå till **Inställningar → Position Size (SEK)** och ange belopp.

💡 **Kelly Criterion:**
Avancerade traders kan beräkna optimal storlek baserat på win rate och risk/reward. Men 2-5% är en bra start!`,
    relatedIds: ["risk-management", "settings", "stop-loss"],
  },

  // ===== SÄKERHET =====
  {
    id: "emergency-stop",
    category: "safety",
    question: "Vad gör nödstoppet?",
    keywords: ["nödstopp", "emergency", "stop", "panik", "stoppa", "allt"],
    shortLabel: "Nödstopp",
    answer: `**Nödstopp** är en panikknapp som omedelbart stoppar all handel.

🚨 **Vad händer:**
• All auto-trading stoppas
• Inga nya ordrar skapas
• Befintliga ordrar i kön avbryts
• (Valfritt) Alla positioner stängs

🔧 **Aktivera:**
• Gå till **Säkerhet** och klicka "AKTIVERA NÖDSTOPP"
• Eller använd snabbknappen i headern (om konfigurerad)

⚠️ **Använd när:**
• Oväntad marknadsrörelse
• Tekniska problem
• Du behöver pausa handeln snabbt

💡 **Tips:** Du kan avaktivera nödstoppet när du är redo att fortsätta.`,
    relatedIds: ["auto-triggers", "conditional-orders", "safety"],
  },
  {
    id: "auto-triggers",
    category: "safety",
    question: "Hur fungerar automatiska triggers?",
    keywords: ["trigger", "automatisk", "regel", "max förlust", "drawdown"],
    shortLabel: "Triggers",
    answer: `**Automatiska triggers** är regler som aktiveras vid specifika förhållanden.

📊 **Typer:**
• **Max daglig förlust** - Stoppa om du förlorar X% idag
• **Max positionsförlust** - Stäng om en position förlorar X%
• **Max drawdown** - Stoppa vid X% total drawdown
• **Vinstmål** - Notifiera/stäng vid X% vinst

🎯 **Åtgärder:**
• Stäng position
• Stäng alla positioner
• Stoppa handel
• Endast notifiera

🔧 **Skapa:**
Gå till **Säkerhet → Automatiska Triggers → Ny Trigger**

💡 **Rekommendation:**
Sätt alltid en "Max daglig förlust" på 3-5%!`,
    relatedIds: ["emergency-stop", "risk-management", "conditional-orders"],
  },
  {
    id: "conditional-orders",
    category: "safety",
    question: "Vad är villkorliga ordrar?",
    keywords: ["villkorlig", "conditional", "order", "limit", "stop order"],
    shortLabel: "Villkorliga",
    answer: `**Villkorliga ordrar** exekveras automatiskt när prisvillkor uppfylls.

📊 **Ordertyper:**

**LIMIT**
• Köp/sälj vid ett specifikt pris eller bättre
• Exempel: Köp om priset faller till $73

**STOP**
• Triggas när priset når en nivå
• Exempel: Sälj om priset faller under $72

**STOP-LIMIT**
• Kombination - triggas som stop, exekveras som limit
• Mer kontroll men risk att inte fyllas

**TRAILING STOP**
• Dynamisk stop som följer priset
• Perfekt för att låta vinsten löpa

🔧 **Skapa:**
Gå till **Säkerhet → Villkorliga Ordrar → Ny Order**`,
    relatedIds: ["trailing-stop", "stop-loss", "take-profit"],
  },

  // ===== ALLMÄNT =====
  {
    id: "bull-bear",
    category: "general",
    question: "Vad är BULL och BEAR?",
    keywords: ["bull", "bear", "olja", "x15", "hävstång", "leverage", "certifikat"],
    shortLabel: "BULL/BEAR",
    answer: `**BULL och BEAR** är hävstångscertifikat för att handla oljepriset.

📊 **Skillnad:**
• **BULL OLJA X15** - Tjänar när oljepriset STIGER
• **BEAR OLJA X15** - Tjänar när oljepriset FALLER

⚡ **Hävstång X15:**
• Om oljan går upp 1% → BULL går upp ~15%
• Om oljan går ned 1% → BULL går ned ~15%
• Samma men omvänt för BEAR

⚠️ **Risker:**
• Hög volatilitet
• Kan förlora mycket snabbt
• Inte lämpligt för långsiktig holding
• "Urholkning" över tid

🎯 **I Brentix:**
• Vid KÖP-signal → Köp BULL
• Vid SÄLJ-signal → Köp BEAR (eller sälj BULL)

💡 **Tips:** Börja med lägre hävstång (X5) om du är ny!`,
    relatedIds: ["signals", "risk-management", "leverage"],
  },
  {
    id: "confidence",
    category: "general",
    question: "Vad betyder konfidensgraden?",
    keywords: ["konfidens", "confidence", "procent", "säkerhet", "sannolikhet"],
    shortLabel: "Konfidens",
    answer: `**Konfidensgrad** visar hur "säker" en signal är.

📊 **Beräkning:**
Baseras på probability up vs probability down:
• 90% upp / 10% ned = 90% konfidens
• 60% upp / 40% ned = 60% konfidens

🎯 **Tolkning:**
• **80%+** = Stark signal, hög tillit
• **65-80%** = Bra signal, normal tillit
• **50-65%** = Svag signal, var försiktig
• **Under 50%** = Ingen tydlig riktning

💡 **Tips:**
• Överväg att bara handla på signaler med 70%+ konfidens
• Kombinera med signalstyrka (STARK/MODERAT/SVAG)
• Lägre konfidens = mindre positionsstorlek`,
    relatedIds: ["signals", "risk-management", "probability"],
  },
  {
    id: "notifications",
    category: "general",
    question: "Hur slår jag på notifikationer?",
    keywords: ["notis", "notification", "push", "ljud", "alert", "varning"],
    shortLabel: "Notiser",
    answer: `**Notifikationer** håller dig uppdaterad om viktiga händelser.

📱 **Typer:**
• **Nya signaler** - När KÖP/SÄLJ genereras
• **Trade exekverad** - När en order gått igenom
• **Daglig sammanfattning** - Summering av dagen
• **Ljudnotiser** - Ping vid händelser

🔧 **Ställ in:**
Gå till **Inställningar → Notifikationer** och välj vilka du vill ha.

🔔 **I appen:**
Klicka på klock-ikonen i headern för att se senaste notiser.

💡 **Tips:**
Ha "Nya signaler" på om du inte kör auto-trading, så du kan agera snabbt!`,
    relatedIds: ["settings", "signals", "auto-trading"],
  },
  {
    id: "dark-mode",
    category: "general", 
    question: "Hur byter jag till mörkt läge?",
    keywords: ["mörkt", "dark", "light", "ljust", "tema", "theme", "läge", "mode"],
    shortLabel: "Tema",
    answer: `**Byt tema** mellan mörkt och ljust läge.

🌙 **Mörkt läge:**
• Bekvämare för ögonen
• Bättre i mörka rum
• Sparar batteri på OLED-skärmar

☀️ **Ljust läge:**
• Bättre i starkt ljus
• Mer "traditionellt" utseende

🔧 **Byta:**
• Klicka på sol/måne-ikonen i headern
• Eller gå till **Inställningar → Utseende**

💡 **Tips:** Systemet kan också följa din enhets inställning automatiskt!`,
    relatedIds: ["settings"],
  },
];

// ===== MATCHING LOGIC =====

/**
 * Finds the best matching help topic for a given question
 */
export function findBestMatch(query: string): {
  answer: string;
  topics: HelpTopic[];
  confidence: number;
} {
  const normalizedQuery = query.toLowerCase().trim();
  const queryWords = normalizedQuery.split(/\s+/);
  
  // Score each topic
  const scoredTopics = HELP_KNOWLEDGE_BASE.map((topic) => {
    let score = 0;
    
    // Exact question match (highest priority)
    if (normalizedQuery === topic.question.toLowerCase()) {
      score += 100;
    }
    
    // Keyword matches
    for (const keyword of topic.keywords) {
      const keywordLower = keyword.toLowerCase();
      
      // Exact keyword in query
      if (normalizedQuery.includes(keywordLower)) {
        score += 20;
      }
      
      // Word-by-word match
      for (const word of queryWords) {
        if (word.length > 2 && keywordLower.includes(word)) {
          score += 5;
        }
        if (word.length > 2 && word.includes(keywordLower)) {
          score += 5;
        }
      }
    }
    
    // Question similarity
    const questionWords = topic.question.toLowerCase().split(/\s+/);
    for (const qWord of questionWords) {
      if (qWord.length > 2 && normalizedQuery.includes(qWord)) {
        score += 3;
      }
    }
    
    return { topic, score };
  });
  
  // Sort by score descending
  scoredTopics.sort((a, b) => b.score - a.score);
  
  const bestMatch = scoredTopics[0];
  const confidence = Math.min(1, bestMatch.score / 50); // Normalize to 0-1
  
  // Get related topics
  const relatedTopics: HelpTopic[] = [];
  if (bestMatch.topic.relatedIds) {
    for (const relatedId of bestMatch.topic.relatedIds) {
      const related = HELP_KNOWLEDGE_BASE.find((t) => t.id === relatedId);
      if (related) {
        relatedTopics.push(related);
      }
    }
  }
  
  // Also include other high-scoring topics as related
  for (let i = 1; i < Math.min(4, scoredTopics.length); i++) {
    if (scoredTopics[i].score > 10 && !relatedTopics.find(t => t.id === scoredTopics[i].topic.id)) {
      relatedTopics.push(scoredTopics[i].topic);
    }
  }
  
  return {
    answer: bestMatch.topic.answer,
    topics: relatedTopics.slice(0, 5),
    confidence,
  };
}

/**
 * Get all topics in a category
 */
export function getTopicsByCategory(category: HelpTopic["category"]): HelpTopic[] {
  return HELP_KNOWLEDGE_BASE.filter((t) => t.category === category);
}

/**
 * Get a topic by ID
 */
export function getTopicById(id: string): HelpTopic | undefined {
  return HELP_KNOWLEDGE_BASE.find((t) => t.id === id);
}
