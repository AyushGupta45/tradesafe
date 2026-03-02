// GET /api/portfolio/analytics — Computed portfolio performance metrics

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { portfolio, simulatedTrade } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

const INITIAL_CAPITAL = 100000;

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pf = await db.query.portfolio.findFirst({
      where: eq(portfolio.userId, user.id),
    });

    const trades = await db
      .select()
      .from(simulatedTrade)
      .where(eq(simulatedTrade.userId, user.id))
      .orderBy(desc(simulatedTrade.executedAt));

    if (trades.length === 0) {
      return NextResponse.json({
        winRate: 0,
        avgProfitPerTrade: 0,
        totalFees: 0,
        maxDrawdown: 0,
        bestTrade: 0,
        worstTrade: 0,
        profitableTrades: 0,
        unprofitableTrades: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        tradeCount: 0,
      });
    }

    // Basic stats
    const profits = trades.map((t) => t.netProfit);
    const winners = profits.filter((p) => p > 0);
    const losers = profits.filter((p) => p < 0);
    const totalFees = trades.reduce((s, t) => s + t.fees, 0);
    const winRate =
      trades.length > 0 ? (winners.length / trades.length) * 100 : 0;
    const avgProfitPerTrade =
      profits.reduce((s, p) => s + p, 0) / trades.length;

    const avgWin =
      winners.length > 0
        ? winners.reduce((s, p) => s + p, 0) / winners.length
        : 0;
    const avgLoss =
      losers.length > 0 ? losers.reduce((s, p) => s + p, 0) / losers.length : 0;

    const totalWins = winners.reduce((s, p) => s + p, 0);
    const totalLosses = Math.abs(losers.reduce((s, p) => s + p, 0));
    const profitFactor =
      totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const bestTrade = profits.length > 0 ? Math.max(...profits) : 0;
    const worstTrade = profits.length > 0 ? Math.min(...profits) : 0;

    // Max drawdown: peak-to-trough in equity curve
    let peak = INITIAL_CAPITAL;
    let maxDrawdown = 0;
    let equity = INITIAL_CAPITAL;

    // Walk trades in chronological order
    for (const t of [...trades].reverse()) {
      equity += t.netProfit;
      if (equity > peak) peak = equity;
      const dd = ((peak - equity) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    return NextResponse.json({
      winRate: parseFloat(winRate.toFixed(1)),
      avgProfitPerTrade: parseFloat(avgProfitPerTrade.toFixed(4)),
      totalFees: parseFloat(totalFees.toFixed(4)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      bestTrade: parseFloat(bestTrade.toFixed(4)),
      worstTrade: parseFloat(worstTrade.toFixed(4)),
      profitableTrades: winners.length,
      unprofitableTrades: losers.length,
      avgWin: parseFloat(avgWin.toFixed(4)),
      avgLoss: parseFloat(avgLoss.toFixed(4)),
      profitFactor:
        profitFactor === Infinity ? 999 : parseFloat(profitFactor.toFixed(2)),
      tradeCount: trades.length,
    });
  } catch (err: any) {
    console.error("[portfolio/analytics]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
