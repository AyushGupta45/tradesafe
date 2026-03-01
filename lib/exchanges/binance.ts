// Binance Exchange Adapter
// Endpoint: GET https://api.binance.com/api/v3/ticker/bookTicker
// Symbols format: BTCUSDT

import { ExchangeAdapter, PriceData } from "./types";

const BASE = "https://api.binance.com/api/v3";

interface BookTicker {
  symbol: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
}

async function fetchPrices(symbols: string[]): Promise<PriceData[]> {
  try {
    const res = await fetch(`${BASE}/ticker/bookTicker`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);

    const data: BookTicker[] = await res.json();
    const wanted = new Set(
      symbols.map((s) => s.replace("/", "").toUpperCase()),
    );
    const now = Date.now();

    return data
      .filter((t) => wanted.has(t.symbol))
      .map((t) => {
        const bid = parseFloat(t.bidPrice);
        const ask = parseFloat(t.askPrice);
        return {
          symbol: t.symbol,
          exchange: "binance",
          bid,
          ask,
          last: (bid + ask) / 2,
          timestamp: now,
        };
      });
  } catch (err) {
    console.error("[binance] fetch error:", err);
    return [];
  }
}

const binance: ExchangeAdapter = {
  name: "binance",
  fetchPrices,
  feeRate: 0.001, // 0.1%
};

export default binance;
