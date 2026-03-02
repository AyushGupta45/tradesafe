// GET /api/scans/history — Detailed scan history with opportunity stats
// Returns enriched scan records for the history page

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scan, simulatedTrade } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getUser } from "@/lib/auth-utils";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scans = await db
      .select()
      .from(scan)
      .where(eq(scan.userId, user.id))
      .orderBy(desc(scan.triggeredAt))
      .limit(50);

    // Get trade counts per scan
    const tradeCounts = await db
      .select({
        scanId: simulatedTrade.scanId,
        count: sql<number>`count(*)`.as("count"),
        totalProfit:
          sql<number>`coalesce(sum(${simulatedTrade.netProfit}), 0)`.as(
            "totalProfit",
          ),
      })
      .from(simulatedTrade)
      .where(eq(simulatedTrade.userId, user.id))
      .groupBy(simulatedTrade.scanId);

    const tradeMap = new Map(
      tradeCounts.map((tc) => [
        tc.scanId,
        { count: tc.count, profit: tc.totalProfit },
      ]),
    );

    const result = scans.map((s) => {
      const opps = Array.isArray(s.opportunities)
        ? (s.opportunities as any[])
        : [];
      const tc = tradeMap.get(s.id);

      // Find best opportunity spread
      const bestSpread =
        opps.length > 0
          ? Math.max(
              ...opps.map((o: any) => o.netSpreadPct ?? o.grossSpreadPct ?? 0),
            )
          : 0;

      // Count unique symbols and exchanges involved
      const symbols = s.symbols || [];
      const exchanges = s.exchanges || [];

      return {
        id: s.id,
        status: s.status,
        symbols,
        exchanges,
        opportunityCount: opps.length,
        bestSpread,
        tradesExecuted: Number(tc?.count ?? 0),
        profitFromScan: Number(tc?.profit ?? 0),
        triggeredAt: s.triggeredAt.toISOString(),
        completedAt: s.completedAt?.toISOString() ?? null,
        durationMs: s.completedAt
          ? s.completedAt.getTime() - s.triggeredAt.getTime()
          : null,
      };
    });

    // Aggregate stats
    const totalScans = result.length;
    const scansWithOpps = result.filter((r) => r.opportunityCount > 0).length;
    const totalOpps = result.reduce((sum, r) => sum + r.opportunityCount, 0);
    const totalTradesFromScans = result.reduce(
      (sum, r) => sum + r.tradesExecuted,
      0,
    );
    const totalProfitFromScans = result.reduce(
      (sum, r) => sum + r.profitFromScan,
      0,
    );

    return NextResponse.json({
      scans: result,
      stats: {
        totalScans,
        scansWithOpps,
        hitRate: totalScans > 0 ? (scansWithOpps / totalScans) * 100 : 0,
        totalOpps,
        totalTradesFromScans,
        totalProfitFromScans,
      },
    });
  } catch (err: any) {
    console.error("[scans/history]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch scan history" },
      { status: 500 },
    );
  }
}
