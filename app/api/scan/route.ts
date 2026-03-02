// POST /api/scan — Trigger a new price scan
// 1. Validate session
// 2. Read user watchlist from DB (or use default)
// 3. Fetch prices from all 5 exchanges
// 4. Detect arbitrage opportunities
// 5. Store scan in DB
// 6. Return scan ID + opportunities

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scan, watchlist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/auth-utils";
import { fetchPrices } from "@/lib/agents/priceDiscovery";
import { findOpportunities } from "@/lib/arbitrage/detector";
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

    // Create scan record in "running" state
    const [newScan] = await db
      .insert(scan)
      .values({
        userId: user.id,
        status: "running",
        symbols,
        exchanges: [...EXCHANGES],
      })
      .returning();

    // Fetch prices from all exchanges
    const priceSnapshot = await fetchPrices(symbols);

    // Detect opportunities
    const opportunities = findOpportunities(priceSnapshot);

    // Serialize price data for DB storage
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

    // Update scan with results
    await db
      .update(scan)
      .set({
        status: "completed",
        rawPrices: rawPricesForDb,
        opportunities: opportunities,
        completedAt: new Date(),
      })
      .where(eq(scan.id, newScan.id));

    return NextResponse.json({
      scanId: newScan.id,
      symbols,
      liveExchanges: priceSnapshot.prices.liveExchanges,
      failedExchanges: priceSnapshot.prices.failedExchanges,
      opportunityCount: opportunities.length,
      opportunities,
      prices: rawPricesForDb,
      timestamp: priceSnapshot.timestamp,
    });
  } catch (err: any) {
    console.error("[scan] error:", err);
    return NextResponse.json(
      { error: err.message || "Scan failed" },
      { status: 500 },
    );
  }
}
