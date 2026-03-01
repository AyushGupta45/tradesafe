// Execution Engine — Pure Simulation
// Takes an opportunity + quantity, simulates a fill with realistic slippage,
// updates the portfolio and simulated_trades table.

import { db } from "@/lib/db";
import { simulatedTrade, portfolio } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import type { Opportunity } from "@/lib/arbitrage/detector";

export interface ExecutionInput {
  opportunity: Opportunity;
  allocatedUsd: number;
  userId: string;
  scanId: number;
  debateId: number;
}

export interface ExecutionResult {
  success: boolean;
  tradeId?: number;
  fillBuyPrice: number;
  fillSellPrice: number;
  quantity: number;
  grossProfit: number;
  fees: number;
  netProfit: number;
  slippagePct: number;
  error?: string;
}

/**
 * Simulate executing an arbitrage trade.
 * Applies realistic slippage based on spread width.
 */
export async function executeTrade(
  input: ExecutionInput,
): Promise<ExecutionResult> {
  const { opportunity: opp, allocatedUsd, userId, scanId, debateId } = input;

  // Simulate slippage: 0.01% to 0.05% random
  const slippagePct = 0.01 + Math.random() * 0.04;
  const slippageMult = 1 + slippagePct / 100;

  // Simulated fill prices (buy slightly worse, sell slightly worse)
  const fillBuyPrice = opp.buyPrice * slippageMult;
  const fillSellPrice = opp.sellPrice / slippageMult;

  // Quantity in base asset
  const quantity = allocatedUsd / fillBuyPrice;

  // Gross profit
  const grossProfit = (fillSellPrice - fillBuyPrice) * quantity;

  // Fees
  const fees = allocatedUsd * (opp.estimatedFeePct / 100);

  const netProfit = grossProfit - fees;

  try {
    // Insert trade record
    const [trade] = await db
      .insert(simulatedTrade)
      .values({
        userId,
        scanId,
        debateId,
        symbol: opp.symbol,
        buyExchange: opp.buyExchange,
        sellExchange: opp.sellExchange,
        buyPrice: fillBuyPrice,
        sellPrice: fillSellPrice,
        quantity,
        grossProfit,
        fees,
        netProfit,
      })
      .returning();

    // Update portfolio: deduct nothing (arb is self-funding), just add PnL
    await db
      .update(portfolio)
      .set({
        totalPnl: sql`${portfolio.totalPnl} + ${netProfit}`,
        cashBalance: sql`${portfolio.cashBalance} + ${netProfit}`,
        tradeCount: sql`${portfolio.tradeCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(portfolio.userId, userId));

    return {
      success: true,
      tradeId: trade.id,
      fillBuyPrice,
      fillSellPrice,
      quantity,
      grossProfit,
      fees,
      netProfit,
      slippagePct,
    };
  } catch (err: any) {
    console.error("[execution] DB error:", err);
    return {
      success: false,
      fillBuyPrice,
      fillSellPrice,
      quantity,
      grossProfit,
      fees,
      netProfit,
      slippagePct,
      error: err.message,
    };
  }
}
