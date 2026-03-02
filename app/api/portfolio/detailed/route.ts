// GET /api/portfolio/detailed — Full portfolio with holdings, PnL chart data, and trade history

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { portfolio, simulatedTrade } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import type {
  PortfolioStats,
  Holding,
  PnlDataPoint,
  TradeRecord,
  DetailedPortfolio,
} from "@/types/portfolio";

const INITIAL_CAPITAL = 100000;

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get portfolio record (or create default)
    let pf = (
      await db
        .select()
        .from(portfolio)
        .where(eq(portfolio.userId, user.id))
        .limit(1)
    )[0];

    if (!pf) {
      const [created] = await db
        .insert(portfolio)
        .values({ userId: user.id })
        .returning();
      pf = created;
    }

    // 2. Get all trades ordered by time
    const trades = await db
      .select()
      .from(simulatedTrade)
      .where(eq(simulatedTrade.userId, user.id))
      .orderBy(desc(simulatedTrade.executedAt));

    // 3. Calculate holdings from trade history
    // For manual trades: buy increases position, sell decreases
    // For arbitrage trades: they are self-closing (buy+sell pair)
    const holdingsMap = new Map<string, { qty: number; totalCost: number }>();

    for (const t of [...trades].reverse()) {
      const entry = holdingsMap.get(t.symbol) || { qty: 0, totalCost: 0 };
      const tradeType = t.type || "arbitrage";

      if (tradeType === "manual") {
        const tradeSide = t.side || "buy";
        if (tradeSide === "buy") {
          entry.totalCost += t.buyPrice * t.quantity;
          entry.qty += t.quantity;
        } else {
          // Sell reduces position
          if (entry.qty > 0) {
            const avgCost = entry.totalCost / entry.qty;
            const soldQty = Math.min(t.quantity, entry.qty);
            entry.totalCost -= avgCost * soldQty;
            entry.qty -= soldQty;
          }
        }
      }
      // Arbitrage trades are self-closing (buy and sell simultaneously)
      // They don't change position, only PnL

      holdingsMap.set(t.symbol, entry);
    }

    // Build holdings array (only non-zero positions)
    const holdings: Holding[] = [];
    let holdingsValue = 0;

    const holdingEntries = Array.from(holdingsMap.entries());
    for (const [symbol, data] of holdingEntries) {
      if (data.qty < 0.000001) continue;
      const avgEntry = data.qty > 0 ? data.totalCost / data.qty : 0;
      // Use avg entry as current price proxy (we don't fetch live prices here to keep it fast)
      // The frontend can enhance this with live prices if needed
      const currentPrice = avgEntry; // simplified
      const marketValue = data.qty * currentPrice;
      holdingsValue += marketValue;

      holdings.push({
        symbol,
        quantity: data.qty,
        avgEntryPrice: avgEntry,
        currentPrice,
        marketValue,
        unrealizedPnl: 0, // zero since currentPrice = avgEntry (simplified)
        unrealizedPnlPct: 0,
        allocation: 0, // calculated below
      });
    }

    const totalValue = pf.cashBalance + holdingsValue;

    // Calculate allocation percentages
    for (const h of holdings) {
      h.allocation = totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0;
    }

    // 4. Build PnL history (group by day)
    const pnlMap = new Map<string, { pnl: number; count: number }>();
    let runningPnl = 0;

    for (const t of [...trades].reverse()) {
      const date = new Date(t.executedAt).toISOString().split("T")[0];
      runningPnl += t.netProfit;
      const entry = pnlMap.get(date) || { pnl: 0, count: 0 };
      entry.pnl = runningPnl;
      entry.count += 1;
      pnlMap.set(date, entry);
    }

    const pnlHistory: PnlDataPoint[] = Array.from(pnlMap.entries()).map(
      ([date, data]) => ({
        date,
        pnl: parseFloat(data.pnl.toFixed(2)),
        tradeCount: data.count,
      }),
    );

    // 5. Build stats
    const stats: PortfolioStats = {
      cashBalance: pf.cashBalance,
      totalPnl: pf.totalPnl,
      tradeCount: pf.tradeCount,
      totalValue,
      pnlPercent:
        INITIAL_CAPITAL > 0
          ? ((totalValue - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100
          : 0,
    };

    // 6. Build trade records
    const recentTrades: TradeRecord[] = trades.slice(0, 50).map((t) => ({
      id: t.id,
      symbol: t.symbol,
      type: t.type || "arbitrage",
      side: t.side || "buy",
      buyExchange: t.buyExchange,
      sellExchange: t.sellExchange,
      buyPrice: t.buyPrice,
      sellPrice: t.sellPrice,
      quantity: t.quantity,
      grossProfit: t.grossProfit,
      fees: t.fees,
      netProfit: t.netProfit,
      status: t.status || "filled",
      executedAt: t.executedAt.toISOString(),
    }));

    const result: DetailedPortfolio = {
      stats,
      holdings,
      pnlHistory,
      recentTrades,
    };

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[/api/portfolio/detailed] error:", err);
    return NextResponse.json(
      { error: "Failed to load portfolio" },
      { status: 500 },
    );
  }
}
