// Backtest Engine
// Simulates arbitrage detection over historical kline data.
// Reconstructs approximate bid/ask from candle low/high at each time slot
// and runs the same findOpportunities() detector.

import type {
  HistoricalCandle,
  AllHistoricalResult,
} from "@/lib/exchanges/historical";
import type { PriceSnapshot, SpreadPair } from "@/lib/agents/priceDiscovery";
import type { PriceData } from "@/lib/exchanges/types";
import { findOpportunities, type Opportunity } from "@/lib/arbitrage/detector";
import { feeRates } from "@/lib/exchanges/registry";

export interface BacktestOpportunity extends Opportunity {
  snapshotTime: string; // ISO string of the hour slot
}

export interface HourlyBucket {
  hour: string; // ISO string
  count: number;
  avgSpread: number;
  bestSpread: number;
}

export interface ExchangePairStat {
  buyExchange: string;
  sellExchange: string;
  count: number;
  avgSpread: number;
  totalEstimatedProfit: number;
}

export interface BacktestResult {
  symbols: string[];
  durationDays: number;
  startTime: string;
  endTime: string;
  totalSnapshots: number;
  totalOpportunities: number;
  avgNetSpreadPct: number;
  maxNetSpreadPct: number;
  totalEstimatedProfit: number;
  opportunitiesByHour: HourlyBucket[];
  topOpportunities: BacktestOpportunity[];
  exchangePairStats: ExchangePairStat[];
  liveExchanges: string[];
  failedExchanges: string[];
  symbolBreakdown: { symbol: string; oppCount: number; avgSpread: number }[];
}

/**
 * Run a backtest simulation using historical kline data.
 *
 * Strategy:
 * 1. Collect all unique hourly timestamps across all candles
 * 2. At each hour, build a synthetic PriceSnapshot from candle data:
 *    - bid ≈ candle low  (conservative: worst sell price in the hour)
 *    - ask ≈ candle high (conservative: worst buy price in the hour)
 *    - This is deliberately conservative — real spreads would be tighter
 * 3. Run findOpportunities() on each snapshot
 * 4. Aggregate all results
 */
export function runBacktest(
  historicalData: AllHistoricalResult,
  symbols: string[],
  durationDays: number,
): BacktestResult {
  // Step 1: Build a lookup — timestamp → symbol → exchange → candle
  const timeIndex = new Map<
    number,
    Map<string, Map<string, HistoricalCandle>>
  >();

  for (const [symbol, exchangeMap] of historicalData.data.entries()) {
    for (const [exchange, candles] of exchangeMap.entries()) {
      for (const candle of candles) {
        // Align to hour boundary
        const hourTs = Math.floor(candle.timestamp / 3600000) * 3600000;

        if (!timeIndex.has(hourTs)) timeIndex.set(hourTs, new Map());
        const symbolMap = timeIndex.get(hourTs)!;

        if (!symbolMap.has(symbol)) symbolMap.set(symbol, new Map());
        symbolMap.get(symbol)!.set(exchange, candle);
      }
    }
  }

  // Sort timestamps
  const sortedTimes = Array.from(timeIndex.keys()).sort((a, b) => a - b);

  // Step 2 & 3: For each time slot, build snapshot and detect opportunities
  const allOpportunities: BacktestOpportunity[] = [];
  const hourlyMap = new Map<
    string,
    { count: number; totalSpread: number; bestSpread: number }
  >();
  const pairMap = new Map<
    string,
    { count: number; totalSpread: number; totalProfit: number }
  >();
  const symbolStats = new Map<string, { count: number; totalSpread: number }>();

  // Pre-populate all symbols so they appear in breakdown even with 0 opps
  for (const sym of symbols) {
    symbolStats.set(sym, { count: 0, totalSpread: 0 });
  }

  let totalSnapshots = 0;

  for (const hourTs of sortedTimes) {
    const symbolMap = timeIndex.get(hourTs)!;
    const hourKey = new Date(hourTs).toISOString();

    // Build synthetic PriceSnapshot
    const allPrices: PriceData[] = [];
    const bySymbol = new Map<string, Map<string, PriceData>>();
    const byExchange = new Map<string, Map<string, PriceData>>();
    const exchangeSet = new Set<string>();

    for (const [symbol, exchangeCandles] of symbolMap.entries()) {
      if (!bySymbol.has(symbol)) bySymbol.set(symbol, new Map());

      for (const [exchange, candle] of exchangeCandles.entries()) {
        exchangeSet.add(exchange);

        const priceData: PriceData = {
          symbol,
          exchange,
          bid: candle.low, // conservative bid
          ask: candle.high, // conservative ask
          last: candle.close,
          timestamp: candle.timestamp,
        };

        allPrices.push(priceData);
        bySymbol.get(symbol)!.set(exchange, priceData);

        if (!byExchange.has(exchange)) byExchange.set(exchange, new Map());
        byExchange.get(exchange)!.set(symbol, priceData);
      }
    }

    // Need at least 2 exchanges to compare
    if (exchangeSet.size < 2) continue;

    totalSnapshots++;

    // Build spreads (same logic as priceDiscovery.ts)
    const spreads: SpreadPair[] = [];
    for (const [symbol, exchangeMap] of bySymbol.entries()) {
      const exchanges = Array.from(exchangeMap.entries());
      for (let i = 0; i < exchanges.length; i++) {
        for (let j = 0; j < exchanges.length; j++) {
          if (i === j) continue;

          const [buyEx, buyData] = exchanges[i];
          const [sellEx, sellData] = exchanges[j];

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

    spreads.sort((a, b) => b.netSpreadPct - a.netSpreadPct);

    const snapshot: PriceSnapshot = {
      prices: {
        byExchange,
        bySymbol,
        all: allPrices,
        liveExchanges: Array.from(exchangeSet),
        failedExchanges: [],
        timestamp: hourTs,
      },
      spreads,
      timestamp: hourTs,
    };

    const opportunities = findOpportunities(snapshot);

    // Track results
    for (const opp of opportunities) {
      const backtestOpp: BacktestOpportunity = {
        ...opp,
        snapshotTime: hourKey,
      };
      allOpportunities.push(backtestOpp);

      // Hourly bucket
      if (!hourlyMap.has(hourKey)) {
        hourlyMap.set(hourKey, { count: 0, totalSpread: 0, bestSpread: 0 });
      }
      const hb = hourlyMap.get(hourKey)!;
      hb.count++;
      hb.totalSpread += opp.netSpreadPct;
      hb.bestSpread = Math.max(hb.bestSpread, opp.netSpreadPct);

      // Pair stats
      const pairKey = `${opp.buyExchange}→${opp.sellExchange}`;
      if (!pairMap.has(pairKey)) {
        pairMap.set(pairKey, { count: 0, totalSpread: 0, totalProfit: 0 });
      }
      const ps = pairMap.get(pairKey)!;
      ps.count++;
      ps.totalSpread += opp.netSpreadPct;
      ps.totalProfit += opp.estimatedProfitUsd;

      // Symbol stats
      if (!symbolStats.has(opp.symbol)) {
        symbolStats.set(opp.symbol, { count: 0, totalSpread: 0 });
      }
      const ss = symbolStats.get(opp.symbol)!;
      ss.count++;
      ss.totalSpread += opp.netSpreadPct;
    }
  }

  // Aggregate
  const totalOpportunities = allOpportunities.length;
  const totalSpread = allOpportunities.reduce(
    (sum, o) => sum + o.netSpreadPct,
    0,
  );
  const avgNetSpreadPct =
    totalOpportunities > 0 ? totalSpread / totalOpportunities : 0;
  const maxNetSpreadPct =
    totalOpportunities > 0
      ? Math.max(...allOpportunities.map((o) => o.netSpreadPct))
      : 0;
  const totalEstimatedProfit = allOpportunities.reduce(
    (sum, o) => sum + o.estimatedProfitUsd,
    0,
  );

  // Build hourly buckets for chart (fill missing hours with 0)
  const opportunitiesByHour: HourlyBucket[] = sortedTimes.map((ts) => {
    const hourKey = new Date(ts).toISOString();
    const hb = hourlyMap.get(hourKey);
    return {
      hour: hourKey,
      count: hb?.count ?? 0,
      avgSpread: hb && hb.count > 0 ? hb.totalSpread / hb.count : 0,
      bestSpread: hb?.bestSpread ?? 0,
    };
  });

  // Build exchange pair stats
  const exchangePairStats: ExchangePairStat[] = Array.from(pairMap.entries())
    .map(([key, val]) => {
      const [buyExchange, sellExchange] = key.split("→");
      return {
        buyExchange,
        sellExchange,
        count: val.count,
        avgSpread: val.count > 0 ? val.totalSpread / val.count : 0,
        totalEstimatedProfit: val.totalProfit,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Top 10 opportunities by net spread
  const topOpportunities = allOpportunities
    .sort((a, b) => b.netSpreadPct - a.netSpreadPct)
    .slice(0, 10);

  // Symbol breakdown
  const symbolBreakdown = Array.from(symbolStats.entries())
    .map(([symbol, stats]) => ({
      symbol,
      oppCount: stats.count,
      avgSpread: stats.count > 0 ? stats.totalSpread / stats.count : 0,
    }))
    .sort((a, b) => b.oppCount - a.oppCount);

  const startMs = sortedTimes[0] ?? Date.now();
  const endMs = sortedTimes[sortedTimes.length - 1] ?? Date.now();

  return {
    symbols,
    durationDays,
    startTime: new Date(startMs).toISOString(),
    endTime: new Date(endMs).toISOString(),
    totalSnapshots,
    totalOpportunities,
    avgNetSpreadPct,
    maxNetSpreadPct,
    totalEstimatedProfit,
    opportunitiesByHour,
    topOpportunities,
    exchangePairStats,
    liveExchanges: historicalData.liveExchanges,
    failedExchanges: historicalData.failedExchanges,
    symbolBreakdown,
  };
}
