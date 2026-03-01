// Gate.io Exchange Adapter
// Endpoint: GET https://api.gateio.ws/api/v4/spot/tickers
// Symbols format: BTC_USDT

import { ExchangeAdapter, PriceData } from "./types";

const BASE = "https://api.gateio.ws/api/v4/spot";

function toGateSymbol(s: string): string {
  const clean = s.replace("/", "").toUpperCase();
  const base = clean.replace("USDT", "");
  return `${base}_USDT`;
}

function fromGateSymbol(s: string): string {
  return s.replace("_", "");
}

interface GateTicker {
  currency_pair: string;
  highest_bid: string;
  lowest_ask: string;
  last: string;
}

async function fetchPrices(symbols: string[]): Promise<PriceData[]> {
  try {
    const res = await fetch(`${BASE}/tickers`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Gate.io HTTP ${res.status}`);

    const data: GateTicker[] = await res.json();
    const wantedGate = new Set(symbols.map(toGateSymbol));
    const now = Date.now();

    return data
      .filter((t) => wantedGate.has(t.currency_pair))
      .map((t) => {
        const bid = parseFloat(t.highest_bid) || 0;
        const ask = parseFloat(t.lowest_ask) || 0;
        const last = parseFloat(t.last) || 0;
        return {
          symbol: fromGateSymbol(t.currency_pair),
          exchange: "gateio",
          bid,
          ask,
          last,
          timestamp: now,
        };
      })
      .filter((p) => p.bid > 0 && p.ask > 0);
  } catch (err) {
    console.error("[gateio] fetch error:", err);
    return [];
  }
}

const gateio: ExchangeAdapter = {
  name: "gateio",
  fetchPrices,
  feeRate: 0.002, // 0.2%
};

export default gateio;
