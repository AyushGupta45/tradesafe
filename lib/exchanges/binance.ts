// Binance Exchange Adapter
// Endpoint: GET https://api.binance.com/api/v3/ticker/bookTicker
// Symbols format: BTCUSDT
// Note: api.binance.com is geo-blocked from US IPs.
// Fallback hosts (api1–api4) are Binance's official alternatives.

import { ExchangeAdapter, PriceData } from "./types";

// Binance official fallback hostnames — try them in order
const BINANCE_HOSTS = [
  "https://api.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
  "https://api4.binance.com",
];

interface BookTicker {
  symbol: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
}

async function fetchWithFallback(path: string): Promise<Response> {
  let lastError: unknown;
  for (const host of BINANCE_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, {
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
        headers: { "Accept-Encoding": "gzip" },
      });
      // 451 = geo-blocked, 403 = IP banned — try next host
      if (res.status === 451 || res.status === 403) {
        console.warn(`[binance] ${host} returned ${res.status}, trying next host`);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      console.warn(`[binance] ${host} failed:`, err);
    }
  }
  throw lastError ?? new Error("All Binance hosts failed");
}

async function fetchPrices(symbols: string[]): Promise<PriceData[]> {
  try {
    const res = await fetchWithFallback("/api/v3/ticker/bookTicker");
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
