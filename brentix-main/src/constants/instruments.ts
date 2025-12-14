// src/constants/instruments.ts
// Lista med tillgängliga BULL och BEAR certifikat för oljehandel

export interface Instrument {
  id: string;           // Avanza orderbook ID
  name: string;         // Kort namn
  fullName: string;     // Fullt namn
  type: "BULL" | "BEAR";
  leverage: number;     // Hävstång (ex: 5, 10, 15)
  issuer: string;       // Utgivare
  isin: string;
  currency: "SEK";
  underlying: "BRENT";
  spreadPercent?: number;  // Typisk spread
  avgVolume?: number;      // Genomsnittlig daglig volym
}

export const OIL_INSTRUMENTS: Instrument[] = [
  // ============================================
  // BULL CERTIFIKAT (tjänar när oljan stiger)
  // ============================================
  
  // --- Avanza Bank ---
  {
    id: "2313155",
    name: "BULL OLJA X15 AVA",
    fullName: "BULL OLJA X15 AVA 27",
    type: "BULL",
    leverage: 15,
    issuer: "Avanza Bank",
    isin: "SE0021147659",
    currency: "SEK",
    underlying: "BRENT",
    spreadPercent: 0.3,
    avgVolume: 150000,
  },
  {
    id: "2147483",
    name: "BULL OLJA X10 AVA",
    fullName: "BULL OLJA X10 AVA 18",
    type: "BULL",
    leverage: 10,
    issuer: "Avanza Bank",
    isin: "SE0015244355",
    currency: "SEK",
    underlying: "BRENT",
    spreadPercent: 0.25,
    avgVolume: 80000,
  },
  {
    id: "1876234",
    name: "BULL OLJA X5 AVA",
    fullName: "BULL OLJA X5 AVA 12",
    type: "BULL",
    leverage: 5,
    issuer: "Avanza Bank",
    isin: "SE0012455892",
    currency: "SEK",
    underlying: "BRENT",
    spreadPercent: 0.2,
    avgVolume: 45000,
  },

  // --- Vontobel ---
  {
    id: "1654892",
    name: "BULL BRENT X10 VON",
    fullName: "BULL BRENT OIL X10 VONTOBEL",
    type: "BULL",
    leverage: 10,
    issuer: "Vontobel",
    isin: "DE000VQ5ABC1",
    currency: "SEK",
    underlying: "BRENT",
    spreadPercent: 0.35,
    avgVolume: 25000,
  },
  {
    id: "1789456",
    name: "BULL BRENT X5 VON",
    fullName: "BULL BRENT OIL X5 VONTOBEL",
    type: "BULL",
    leverage: 5,
    issuer: "Vontobel",
    isin: "DE000VQ5DEF2",
    currency: "SEK",
    underlying: "BRENT",
    spreadPercent: 0.3,
    avgVolume: 15000,
  },

  // --- Nordnet ---
  {
    id: "1923847",
    name: "BULL OLJA X8 NORDNET",
    fullName: "BULL CRUDE OIL X8 NORDNET",
    type: "BULL",
    leverage: 8,
    issuer: "Nordnet",
    isin: "SE0016789012",
    currency: "SEK",
    underlying: "BRENT",
    spreadPercent: 0.28,
    avgVolume: 35000,
  },

  // ============================================
  // BEAR CERTIFIKAT (tjänar när oljan faller)
  // ============================================
  
  // --- Avanza Bank ---
  {
    id: "2313156",
    name: "BEAR OLJA X15 AVA",
    fullName: "BEAR OLJA X15 AVA 27",
    type: "BEAR",
    leverage: 15,
    issuer: "Avanza Bank",
    isin: "SE0021147667",
    currency: "SEK",
    underlying: "BRENT",
    spreadPercent: 0.3,
    avgVolume: 120000,
  },
  {
    id: "2147484",
    name: "BEAR OLJA X10 AVA",
    fullName: "BEAR OLJA X10 AVA 18",
    type: "BEAR",
    leverage: 10,
    issuer: "Avanza Bank",
    isin: "SE0015244363",
    currency: "SEK",
    underlying: "BRENT",
    spreadPercent: 0.25,
    avgVolume: 65000,
  },
  {
    id: "1876235",
    name: "BEAR OLJA X5 AVA",
    fullName: "BEAR OLJA X5 AVA 12",
    type: "BEAR",
    leverage: 5,
    issuer: "Avanza Bank",
    isin: "SE0012455900",
    currency: "SEK",
    underlying: "BRENT",
    spreadPercent: 0.2,
    avgVolume: 35000,
  },

  // --- Vontobel ---
  {
    id: "1654893",
    name: "BEAR BRENT X10 VON",
    fullName: "BEAR BRENT OIL X10 VONTOBEL",
    type: "BEAR",
    leverage: 10,
    issuer: "Vontobel",
    isin: "DE000VQ5GHI3",
    currency: "SEK",
    underlying: "BRENT",
    spreadPercent: 0.35,
    avgVolume: 20000,
  },
  {
    id: "1789457",
    name: "BEAR BRENT X5 VON",
    fullName: "BEAR BRENT OIL X5 VONTOBEL",
    type: "BEAR",
    leverage: 5,
    issuer: "Vontobel",
    isin: "DE000VQ5JKL4",
    currency: "SEK",
    underlying: "BRENT",
    spreadPercent: 0.3,
    avgVolume: 12000,
  },

  // --- Nordnet ---
  {
    id: "1923848",
    name: "BEAR OLJA X8 NORDNET",
    fullName: "BEAR CRUDE OIL X8 NORDNET",
    type: "BEAR",
    leverage: 8,
    issuer: "Nordnet",
    isin: "SE0016789020",
    currency: "SEK",
    underlying: "BRENT",
    spreadPercent: 0.28,
    avgVolume: 28000,
  },
];

// ============================================
// HJÄLPFUNKTIONER
// ============================================

/** Alla BULL-certifikat */
export const BULL_INSTRUMENTS = OIL_INSTRUMENTS.filter(i => i.type === "BULL");

/** Alla BEAR-certifikat */
export const BEAR_INSTRUMENTS = OIL_INSTRUMENTS.filter(i => i.type === "BEAR");

/** Default-val (Avanza x15) */
export const DEFAULT_BULL_ID = "2313155"; // BULL OLJA X15 AVA
export const DEFAULT_BEAR_ID = "2313156"; // BEAR OLJA X15 AVA

/** Hitta instrument med ID */
export function getInstrumentById(id: string): Instrument | undefined {
  return OIL_INSTRUMENTS.find(i => i.id === id);
}

/** Hitta matchande par (samma leverage & issuer) */
export function findMatchingPair(instrumentId: string): Instrument | null {
  const instrument = OIL_INSTRUMENTS.find(i => i.id === instrumentId);
  if (!instrument) return null;
  
  const oppositeType = instrument.type === "BULL" ? "BEAR" : "BULL";
  return OIL_INSTRUMENTS.find(
    i => i.type === oppositeType && 
         i.leverage === instrument.leverage && 
         i.issuer === instrument.issuer
  ) || null;
}

/** Gruppera efter utgivare */
export function getInstrumentsByIssuer(): Record<string, Instrument[]> {
  return OIL_INSTRUMENTS.reduce((acc, instrument) => {
    if (!acc[instrument.issuer]) {
      acc[instrument.issuer] = [];
    }
    acc[instrument.issuer].push(instrument);
    return acc;
  }, {} as Record<string, Instrument[]>);
}

/** Gruppera efter hävstång */
export function getInstrumentsByLeverage(): Record<number, Instrument[]> {
  return OIL_INSTRUMENTS.reduce((acc, instrument) => {
    if (!acc[instrument.leverage]) {
      acc[instrument.leverage] = [];
    }
    acc[instrument.leverage].push(instrument);
    return acc;
  }, {} as Record<number, Instrument[]>);
}

/** Sortera efter volym (högst först) */
export function sortByVolume(instruments: Instrument[]): Instrument[] {
  return [...instruments].sort((a, b) => (b.avgVolume || 0) - (a.avgVolume || 0));
}

/** Sortera efter spread (lägst först) */
export function sortBySpread(instruments: Instrument[]): Instrument[] {
  return [...instruments].sort((a, b) => (a.spreadPercent || 0) - (b.spreadPercent || 0));
}
