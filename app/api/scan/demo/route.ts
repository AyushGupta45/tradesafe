// POST /api/scan/demo — Trigger a demo scan with synthetic arbitrage
// Uses real prices from exchanges but injects a guaranteed opportunity
// so the full debate → execute pipeline can be tested.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scan, watchlist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/auth-utils";
import { fetchPrices } from "@/lib/agents/priceDiscovery";
import { DEFAULT_WATCHLIST, EXCHANGES } from "@/constants";

export async function POST() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's watchlist symbols (fallback to default)
    const wl = await db.query.watchlist.findFirst({
      where: eq(watchlist.userId, user.id),
    });
    const symbols: string[] = wl?.symbols ?? DEFAULT_WATCHLIST;

    // Create scan record
    const [newScan] = await db
      .insert(scan)
      .values({
        userId: user.id,
        status: "running",
        symbols,
        exchanges: [...EXCHANGES],
      })
      .returning();

    // Fetch real prices from exchanges
    const priceSnapshot = await fetchPrices(symbols);

    // Build raw prices map
    const rawPricesForDb: Record<
      string,
      Record<string, { bid: number; ask: number; last: number }>
    > = {};
    for (const p of priceSnapshot.prices.all) {
      if (!rawPricesForDb[p.symbol]) rawPricesForDb[p.symbol] = {};
      rawPricesForDb[p.symbol][p.exchange] = {
        bid: p.bid,
        ask: p.ask,
        last: p.last,
      };
    }

    // Pick the first symbol that has data on at least 2 exchanges
    let demoSymbol = "BTCUSDT";
    let buyEx = "binance";
    let sellEx = "kraken";
    let baseBid = 95000;
    let baseAsk = 94950;

    for (const [symbol, exMap] of Object.entries(rawPricesForDb)) {
      const exchanges = Object.keys(exMap);
      if (exchanges.length >= 2) {
        demoSymbol = symbol;
        buyEx = exchanges[0];
        sellEx = exchanges[1];
        baseAsk = exMap[buyEx].ask;
        baseBid = exMap[sellEx].bid;
        break;
      }
    }

    // Create a synthetic opportunity with ~0.15% net spread
    // Artificially lower the buy price and raise the sell price
    const syntheticBuyAsk = baseAsk * 0.998; // 0.2% lower ask
    const syntheticSellBid = baseBid * 1.001; // 0.1% higher bid
    const grossSpreadPct =
      ((syntheticSellBid - syntheticBuyAsk) / syntheticBuyAsk) * 100;
    const estimatedFeePct = 0.2; // ~0.1% per side
    const netSpreadPct = grossSpreadPct - estimatedFeePct;

    const demoOpportunity = {
      id: `demo_${demoSymbol}_${buyEx}_${sellEx}_${Date.now()}`,
      symbol: demoSymbol,
      buyExchange: buyEx,
      sellExchange: sellEx,
      buyPrice: syntheticBuyAsk,
      sellPrice: syntheticSellBid,
      grossSpreadPct,
      netSpreadPct: Math.max(netSpreadPct, 0.1),
      estimatedFeePct,
      estimatedProfitUsd: (Math.max(netSpreadPct, 0.1) / 100) * 1000,
      confidence: 0.75,
      timestamp: Date.now(),
    };

    const opportunities = [demoOpportunity];

    // Update scan with results
    await db
      .update(scan)
      .set({
        status: "completed",
        rawPrices: rawPricesForDb,
        opportunities,
        completedAt: new Date(),
      })
      .where(eq(scan.id, newScan.id));

    return NextResponse.json({
      scanId: newScan.id,
      symbols,
      liveExchanges: priceSnapshot.prices.liveExchanges,
      failedExchanges: priceSnapshot.prices.failedExchanges,
      opportunityCount: 1,
      opportunities,
      prices: rawPricesForDb,
      timestamp: priceSnapshot.timestamp,
      demo: true,
    });
  } catch (err: any) {
    console.error("[scan/demo] error:", err);
    return NextResponse.json(
      { error: err.message || "Demo scan failed" },
      { status: 500 },
    );
  }
}
