// Price Discovery Agent
// Fetches real prices from all 6 exchanges via the registry,
// computes cross-exchange spreads, and returns a structured snapshot.

import {
  fetchAllPrices,
  feeRates,
  type FetchResult,
} from "@/lib/exchanges/registry";
import type { PriceData } from "@/lib/exchanges/types";

export interface SpreadPair {
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyAsk: number; // best ask on buy exchange
  sellBid: number; // best bid on sell exchange
  grossSpreadPct: number;
  buyFee: number; // fraction
  sellFee: number; // fraction
  netSpreadPct: number; // gross - fees
}

export interface PriceSnapshot {
  prices: FetchResult;
  spreads: SpreadPair[];
  timestamp: number;
}

/**
 * Fetch prices from all exchanges and calculate every cross-exchange spread.
 */
export async function fetchPrices(symbols: string[]): Promise<PriceSnapshot> {
  const prices = await fetchAllPrices(symbols);

  const spreads: SpreadPair[] = [];

  // For each symbol, compare every exchange pair
  const symbolEntries = Array.from(prices.bySymbol.entries());
  for (const [symbol, exchangeMap] of symbolEntries) {
    const exchanges = Array.from(exchangeMap.entries());

    for (let i = 0; i < exchanges.length; i++) {
      for (let j = 0; j < exchanges.length; j++) {
        if (i === j) continue;

        const [buyEx, buyData] = exchanges[i]; // buy from exchange i (at ask)
        const [sellEx, sellData] = exchanges[j]; // sell on exchange j (at bid)

        if (buyData.ask <= 0 || sellData.bid <= 0) continue;

        const grossSpreadPct =
          ((sellData.bid - buyData.ask) / buyData.ask) * 100;

        const buyFee = feeRates[buyEx] ?? 0.001;
        const sellFee = feeRates[sellEx] ?? 0.001;
        const totalFeesPct = (buyFee + sellFee) * 100;
        const netSpreadPct = grossSpreadPct - totalFeesPct;

        spreads.push({
          symbol,
          buyExchange: buyEx,
          sellExchange: sellEx,
          buyAsk: buyData.ask,
          sellBid: sellData.bid,
          grossSpreadPct,
          buyFee,
          sellFee,
          netSpreadPct,
        });
      }
    }
  }

  // Sort by net spread descending
  spreads.sort((a, b) => b.netSpreadPct - a.netSpreadPct);

  return {
    prices,
    spreads,
    timestamp: Date.now(),
  };
}
