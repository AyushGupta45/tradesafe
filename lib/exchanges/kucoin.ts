// KuCoin Exchange Adapter
// Endpoint: GET https://api.kucoin.com/api/v1/market/allTickers
// Symbols format: BTC-USDT

import { ExchangeAdapter, PriceData } from "./types";

const BASE = "https://api.kucoin.com/api/v1";

// Map normalised symbol → KuCoin format
function toKucoinSymbol(s: string): string {
  const clean = s.replace("/", "").toUpperCase();
  // BTCUSDT → BTC-USDT
  const base = clean.replace("USDT", "");
  return `${base}-USDT`;
}

function fromKucoinSymbol(s: string): string {
  // BTC-USDT → BTCUSDT
  return s.replace("-", "");
}

interface KucoinTicker {
  symbol: string;
  buy: string; // best bid
  sell: string; // best ask
  last: string;
}

interface KucoinResponse {
  code: string;
  data: {
    ticker: KucoinTicker[];
  };
}

async function fetchPrices(symbols: string[]): Promise<PriceData[]> {
  try {
    const res = await fetch(`${BASE}/market/allTickers`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`KuCoin HTTP ${res.status}`);

    const data: KucoinResponse = await res.json();
    if (data.code !== "200000") {
      console.warn("[kucoin] API error code:", data.code);
      return [];
    }

    const wantedKucoin = new Set(symbols.map(toKucoinSymbol));
    const now = Date.now();

    return data.data.ticker
      .filter((t) => wantedKucoin.has(t.symbol))
      .map((t) => {
        const bid = parseFloat(t.buy) || 0;
        const ask = parseFloat(t.sell) || 0;
        const last = parseFloat(t.last) || 0;
        return {
          symbol: fromKucoinSymbol(t.symbol),
          exchange: "kucoin",
          bid,
          ask,
          last,
          timestamp: now,
        };
      })
      .filter((p) => p.bid > 0 && p.ask > 0);
  } catch (err) {
    console.error("[kucoin] fetch error:", err);
    return [];
  }
}

const kucoin: ExchangeAdapter = {
  name: "kucoin",
  fetchPrices,
  feeRate: 0.001, // 0.1%
};

export default kucoin;
