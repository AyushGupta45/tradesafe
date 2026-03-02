// Bybit Exchange Adapter
// Endpoint: GET https://api.bybit.com/v5/market/tickers?category=spot
// Symbols format: BTCUSDT
// Note: api.bybit.com can be geo-restricted from some cloud IPs.
// api.bytick.com is Bybit's official alternative hostname.

import { ExchangeAdapter, PriceData } from "./types";

// Bybit official hostnames — try in order
const BYBIT_HOSTS = [
  "https://api.bybit.com",
  "https://api.bytick.com",
];

interface BybitTicker {
  symbol: string;
  bid1Price: string;
  bid1Size: string;
  ask1Price: string;
  ask1Size: string;
  lastPrice: string;
}

interface BybitResponse {
  retCode: number;
  result: {
    list: BybitTicker[];
  };
}

async function fetchWithFallback(path: string): Promise<Response> {
  let lastError: unknown;
  for (const host of BYBIT_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, {
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      if (res.status === 403 || res.status === 451) {
        console.warn(`[bybit] ${host} returned ${res.status}, trying next host`);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      console.warn(`[bybit] ${host} failed:`, err);
    }
  }
  throw lastError ?? new Error("All Bybit hosts failed");
}

async function fetchPrices(symbols: string[]): Promise<PriceData[]> {
  try {
    const res = await fetchWithFallback("/v5/market/tickers?category=spot");
    if (!res.ok) throw new Error(`Bybit HTTP ${res.status}`);

    const data: BybitResponse = await res.json();
    if (data.retCode !== 0) {
      console.warn("[bybit] API error:", data.retCode);
      return [];
    }

    const wanted = new Set(
      symbols.map((s) => s.replace("/", "").toUpperCase()),
    );
    const now = Date.now();

    return data.result.list
      .filter((t) => wanted.has(t.symbol))
      .map((t) => {
        const bid = parseFloat(t.bid1Price) || 0;
        const ask = parseFloat(t.ask1Price) || 0;
        const last = parseFloat(t.lastPrice) || 0;
        return {
          symbol: t.symbol,
          exchange: "bybit",
          bid,
          ask,
          last,
          timestamp: now,
        };
      })
      .filter((p) => p.bid > 0 && p.ask > 0);
  } catch (err) {
    console.error("[bybit] fetch error:", err);
    return [];
  }
}

const bybit: ExchangeAdapter = {
  name: "bybit",
  fetchPrices,
  feeRate: 0.001, // 0.1%
};

export default bybit;
