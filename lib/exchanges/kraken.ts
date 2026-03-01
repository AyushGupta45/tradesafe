// Kraken Exchange Adapter
// Endpoint: GET https://api.kraken.com/0/public/Ticker?pair=XBTUSD,...
// Kraken uses non-standard pair names — we maintain a mapping.

import { ExchangeAdapter, PriceData } from "./types";

const BASE = "https://api.kraken.com/0/public";

// Map normalised symbol → Kraken pair name
const PAIR_MAP: Record<string, string> = {
  BTCUSDT: "XBTUSDT",
  ETHUSDT: "ETHUSDT",
  SOLUSDT: "SOLUSDT",
  XRPUSDT: "XRPUSDT",
  BNBUSDT: "BNBUSDT",
  ADAUSDT: "ADAUSDT",
  DOGEUSDT: "XDGUSDT",
  DOTUSDT: "DOTUSDT",
  AVAXUSDT: "AVAXUSDT",
  LINKUSDT: "LINKUSDT",
};

// Reverse map: kraken pair → normalised symbol
const REVERSE_MAP: Record<string, string> = {};
for (const [norm, kraken] of Object.entries(PAIR_MAP)) {
  REVERSE_MAP[kraken] = norm;
}

interface KrakenTickerEntry {
  a: [string, string, string]; // ask [price, wholeLotVol, lotVol]
  b: [string, string, string]; // bid
  c: [string, string]; // last [price, lotVol]
}

interface KrakenResponse {
  error: string[];
  result: Record<string, KrakenTickerEntry>;
}

async function fetchPrices(symbols: string[]): Promise<PriceData[]> {
  try {
    const krakenPairs = symbols
      .map((s) => PAIR_MAP[s.replace("/", "").toUpperCase()])
      .filter(Boolean);

    if (krakenPairs.length === 0) return [];

    const pairParam = krakenPairs.join(",");
    const res = await fetch(`${BASE}/Ticker?pair=${pairParam}`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Kraken HTTP ${res.status}`);

    const data: KrakenResponse = await res.json();
    if (data.error?.length) {
      console.warn("[kraken] API errors:", data.error);
    }

    const now = Date.now();
    const prices: PriceData[] = [];

    for (const [pairKey, ticker] of Object.entries(data.result || {})) {
      // Kraken may return pair key with or without prefix
      const normalized =
        REVERSE_MAP[pairKey] ||
        REVERSE_MAP[pairKey.replace(/^X|^Z/g, "")] ||
        // Try matching by iterating
        Object.entries(REVERSE_MAP).find(([k]) => pairKey.includes(k))?.[1];

      if (!normalized) continue;

      const bid = parseFloat(ticker.b[0]);
      const ask = parseFloat(ticker.a[0]);
      const last = parseFloat(ticker.c[0]);

      prices.push({
        symbol: normalized,
        exchange: "kraken",
        bid,
        ask,
        last,
        timestamp: now,
      });
    }

    return prices;
  } catch (err) {
    console.error("[kraken] fetch error:", err);
    return [];
  }
}

const kraken: ExchangeAdapter = {
  name: "kraken",
  fetchPrices,
  feeRate: 0.0026, // 0.26% (taker)
};

export default kraken;
