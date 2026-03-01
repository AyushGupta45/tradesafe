// Exchange Registry
// Central entry point — calls all 5 adapters in parallel,
// normalises results into a unified price map.

import type { ExchangeAdapter, PriceData } from "./types";
import binance from "./binance";
import kraken from "./kraken";
import kucoin from "./kucoin";
import bybit from "./bybit";
import gateio from "./gateio";

export const adapters: ExchangeAdapter[] = [
  binance,
  kraken,
  kucoin,
  bybit,
  gateio,
];

/** Fee rate lookup by exchange name */
export const feeRates: Record<string, number> = Object.fromEntries(
  adapters.map((a) => [a.name, a.feeRate]),
);

export interface FetchResult {
  /** exchange → symbol → PriceData */
  byExchange: Map<string, Map<string, PriceData>>;
  /** symbol → exchange → PriceData  (transposed for easy cross-exchange comparison) */
  bySymbol: Map<string, Map<string, PriceData>>;
  /** flat array of every price point */
  all: PriceData[];
  /** exchanges that responded successfully */
  liveExchanges: string[];
  /** exchanges that failed */
  failedExchanges: string[];
  timestamp: number;
}

/**
 * Fetch prices from all exchanges in parallel.
 * Uses Promise.allSettled so one down exchange doesn't block the rest.
 */
export async function fetchAllPrices(symbols: string[]): Promise<FetchResult> {
  const results = await Promise.allSettled(
    adapters.map((adapter) => adapter.fetchPrices(symbols)),
  );

  const byExchange = new Map<string, Map<string, PriceData>>();
  const bySymbol = new Map<string, Map<string, PriceData>>();
  const all: PriceData[] = [];
  const liveExchanges: string[] = [];
  const failedExchanges: string[] = [];

  results.forEach((result, idx) => {
    const adapter = adapters[idx];

    if (
      result.status === "rejected" ||
      (result.status === "fulfilled" && result.value.length === 0)
    ) {
      failedExchanges.push(adapter.name);
      return;
    }

    liveExchanges.push(adapter.name);
    const prices = result.value;
    const exchangeMap = new Map<string, PriceData>();

    for (const p of prices) {
      exchangeMap.set(p.symbol, p);
      all.push(p);

      if (!bySymbol.has(p.symbol)) {
        bySymbol.set(p.symbol, new Map());
      }
      bySymbol.get(p.symbol)!.set(p.exchange, p);
    }

    byExchange.set(adapter.name, exchangeMap);
  });

  return {
    byExchange,
    bySymbol,
    all,
    liveExchanges,
    failedExchanges,
    timestamp: Date.now(),
  };
}
