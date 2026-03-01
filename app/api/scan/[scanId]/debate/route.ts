// POST /api/scan/[scanId]/debate — Run AI debate on a specific opportunity
// Body: { opportunityIndex: number }

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scan, debate, portfolio, guardianSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/auth-utils";
import { assessRisk } from "@/lib/agents/riskAssessment";
import { allocateCapitalForOpportunity } from "@/lib/agents/capitalAllocation";
import { debateOpportunity } from "@/lib/agents/debateAgent";

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
    const oppIndex = body.opportunityIndex ?? 0;

    // Load scan from DB
    const scanRow = await db.query.scan.findFirst({
      where: eq(scan.id, parseInt(scanId)),
    });

    if (!scanRow || scanRow.userId !== user.id) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const opportunities = (scanRow.opportunities as any[]) || [];
    if (oppIndex < 0 || oppIndex >= opportunities.length) {
      return NextResponse.json(
        { error: "Invalid opportunity index" },
        { status: 400 },
      );
    }

    const opp = opportunities[oppIndex];

    // Get user's portfolio
    let userPortfolio = await db.query.portfolio.findFirst({
      where: eq(portfolio.userId, user.id),
    });
    if (!userPortfolio) {
      // Create default portfolio
      const [created] = await db
        .insert(portfolio)
        .values({ userId: user.id })
        .returning();
      userPortfolio = created;
    }

    // Get guardian settings
    const guardian = await db.query.guardianSettings.findFirst({
      where: eq(guardianSettings.userId, user.id),
    });

    // 1. Risk assessment
    const risk = assessRisk(opp);

    // Guardian veto check
    const vetoThreshold = guardian?.riskScoreVeto ?? 75;
    if (risk.riskScore >= vetoThreshold) {
      // Still store the debate but mark as skip
      const [debateRow] = await db
        .insert(debate)
        .values({
          scanId: parseInt(scanId),
          userId: user.id,
          opportunityIndex: oppIndex,
          symbol: opp.symbol,
          buyExchange: opp.buyExchange,
          sellExchange: opp.sellExchange,
          spreadPercent: opp.grossSpreadPct,
          riskAssessment: risk,
          recommendation: "skip",
          reasoning: `Guardian veto: risk score ${risk.riskScore} >= threshold ${vetoThreshold}`,
        })
        .returning();

      return NextResponse.json({
        debateId: debateRow.id,
        verdict: "skip",
        confidence: 0,
        reasoning: `Guardian veto: risk score ${risk.riskScore} >= threshold ${vetoThreshold}`,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        guardianVeto: true,
      });
    }

    // 2. Capital allocation
    const allocation = allocateCapitalForOpportunity(
      opp,
      risk,
      {
        cashBalance: userPortfolio.cashBalance,
        totalPnl: userPortfolio.totalPnl,
        tradeCount: userPortfolio.tradeCount,
      },
      guardian?.maxTradePercent ?? 15,
    );

    // 3. AI Debate
    const debateResult = await debateOpportunity(opp, risk, allocation);

    // Store debate
    const [debateRow] = await db
      .insert(debate)
      .values({
        scanId: parseInt(scanId),
        userId: user.id,
        opportunityIndex: oppIndex,
        symbol: opp.symbol,
        buyExchange: opp.buyExchange,
        sellExchange: opp.sellExchange,
        spreadPercent: opp.grossSpreadPct,
        riskAssessment: risk,
        capitalAllocation: allocation,
        bullishArgs: debateResult.bullArgs,
        bearishArgs: debateResult.bearArgs,
        consensus: {
          verdict: debateResult.verdict,
          confidence: debateResult.confidence,
          mediatorArgs: debateResult.mediatorArgs,
        },
        recommendation: debateResult.verdict,
        reasoning: debateResult.reasoning,
      })
      .returning();

    return NextResponse.json({
      debateId: debateRow.id,
      verdict: debateResult.verdict,
      confidence: debateResult.confidence,
      reasoning: debateResult.reasoning,
      riskNotes: debateResult.riskNotes,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
      allocation: {
        amount: allocation.allocatedUsd,
        percent: allocation.allocationPct,
        reason: allocation.reason,
      },
      bullArgs: debateResult.bullArgs,
      bearArgs: debateResult.bearArgs,
      mediatorArgs: debateResult.mediatorArgs,
      expectedProfit: (allocation.allocatedUsd * opp.netSpreadPct) / 100,
    });
  } catch (err: any) {
    console.error("[debate] error:", err);
    return NextResponse.json(
      { error: err.message || "Debate failed" },
      { status: 500 },
    );
  }
}
