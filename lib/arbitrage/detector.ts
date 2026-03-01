// Arbitrage Opportunity Detector
// Compares best bid on one exchange vs best ask on another,
// flags opportunities where net spread > fee estimate.

import type { PriceSnapshot, SpreadPair } from "@/lib/agents/priceDiscovery";

export interface Opportunity {
  id: string;
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number; // ask on buy exchange
  sellPrice: number; // bid on sell exchange
  grossSpreadPct: number;
  netSpreadPct: number;
  estimatedFeePct: number;
  estimatedProfitUsd: number; // rough on $1000 notional
  confidence: number; // 0-1
  timestamp: number;
}

export interface DetectorConfig {
  /** Minimum net spread (after fees) to qualify, in percent. Default 0.05 */
  minNetSpreadPct?: number;
}

/**
 * Find arbitrage opportunities from a price snapshot.
 * For every symbol, considers all 15 exchange-pair combinations (6 choose 2 directions × 2).
 */
export function findOpportunities(
  snapshot: PriceSnapshot,
  config: DetectorConfig = {},
): Opportunity[] {
  const { minNetSpreadPct = 0.05 } = config;

  const opportunities: Opportunity[] = [];

  for (const spread of snapshot.spreads) {
    if (spread.netSpreadPct < minNetSpreadPct) continue;

    // Confidence: higher net spread = higher confidence, but cap and discount extremes
    let confidence = 0.5;
    if (spread.netSpreadPct > 0.1 && spread.netSpreadPct < 5) confidence = 0.7;
    if (spread.netSpreadPct > 0.3 && spread.netSpreadPct < 3) confidence = 0.85;
    if (spread.netSpreadPct > 10) confidence = 0.2; // too good to be true

    const estimatedFeePct = (spread.buyFee + spread.sellFee) * 100;

    opportunities.push({
      id: `${spread.symbol}_${spread.buyExchange}_${spread.sellExchange}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      symbol: spread.symbol,
      buyExchange: spread.buyExchange,
      sellExchange: spread.sellExchange,
      buyPrice: spread.buyAsk,
      sellPrice: spread.sellBid,
      grossSpreadPct: spread.grossSpreadPct,
      netSpreadPct: spread.netSpreadPct,
      estimatedFeePct,
      estimatedProfitUsd: (spread.netSpreadPct / 100) * 1000, // profit on $1k notional
      confidence,
      timestamp: snapshot.timestamp,
    });
  }

  // Sort by net spread descending
  opportunities.sort((a, b) => b.netSpreadPct - a.netSpreadPct);

  return opportunities;
}
