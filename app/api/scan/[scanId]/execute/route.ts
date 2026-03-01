// POST /api/scan/[scanId]/execute — Simulate executing a recommended trade
// Body: { debateId: number }

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  scan,
  debate,
  portfolio,
  guardianSettings,
  simulatedTrade,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getUser } from "@/lib/auth-utils";
import { executeTrade } from "@/lib/agents/executionEngine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { scanId } = await params;
    const body = await request.json();
    const { debateId } = body;

    if (!debateId) {
      return NextResponse.json(
        { error: "debateId is required" },
        { status: 400 },
      );
    }

    // Load debate
    const debateRow = await db.query.debate.findFirst({
      where: eq(debate.id, debateId),
    });

    if (!debateRow || debateRow.userId !== user.id) {
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }

    if (debateRow.recommendation !== "execute") {
      return NextResponse.json(
        { error: 'Debate recommendation was "skip" — cannot execute' },
        { status: 400 },
      );
    }

    // Load scan to get opportunity data
    const scanRow = await db.query.scan.findFirst({
      where: eq(scan.id, parseInt(scanId)),
    });

    if (!scanRow) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const opportunities = (scanRow.opportunities as any[]) || [];
    const opp = opportunities[debateRow.opportunityIndex];

    if (!opp) {
      return NextResponse.json(
        { error: "Opportunity not found in scan" },
        { status: 404 },
      );
    }

    // Get portfolio
    let userPortfolio = await db.query.portfolio.findFirst({
      where: eq(portfolio.userId, user.id),
    });

    if (!userPortfolio) {
      const [created] = await db
        .insert(portfolio)
        .values({ userId: user.id })
        .returning();
      userPortfolio = created;
    }

    // Get allocation from debate
    const allocation = debateRow.capitalAllocation as any;
    const allocatedUsd = allocation?.allocatedUsd ?? 1000;

    // Check daily trade limit
    const guardian = await db.query.guardianSettings.findFirst({
      where: eq(guardianSettings.userId, user.id),
    });
    const maxDaily = guardian?.maxDailyTrades ?? 30;

    // Count today's trades
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate enough capital
    if (userPortfolio.cashBalance < allocatedUsd) {
      return NextResponse.json(
        {
          error: `Insufficient capital. Balance: $${userPortfolio.cashBalance.toFixed(2)}, needed: $${allocatedUsd.toFixed(2)}`,
        },
        { status: 400 },
      );
    }

    // Execute simulated trade
    const result = await executeTrade({
      opportunity: opp,
      allocatedUsd,
      userId: user.id,
      scanId: parseInt(scanId),
      debateId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Execution failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      tradeId: result.tradeId,
      symbol: opp.symbol,
      buyExchange: opp.buyExchange,
      sellExchange: opp.sellExchange,
      fillBuyPrice: result.fillBuyPrice,
      fillSellPrice: result.fillSellPrice,
      quantity: result.quantity,
      grossProfit: result.grossProfit,
      fees: result.fees,
      netProfit: result.netProfit,
      slippagePct: result.slippagePct,
    });
  } catch (err: any) {
    console.error("[execute] error:", err);
    return NextResponse.json(
      { error: err.message || "Execution failed" },
      { status: 500 },
    );
  }
}
