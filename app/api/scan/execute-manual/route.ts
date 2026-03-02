// POST /api/scan/execute-manual — Execute a manual (non-arbitrage) simulated trade
// Supports buy/sell on a single exchange.

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { simulatedTrade, portfolio } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { feeRates } from "@/lib/exchanges/registry";
import { fetchAllOrderBooks } from "@/lib/exchanges/orderbook";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { symbol, exchange, side, amountUsd, price } = body;

  if (!symbol || !exchange || !side || !amountUsd) {
    return NextResponse.json(
      { error: "Missing required fields: symbol, exchange, side, amountUsd" },
      { status: 400 },
    );
  }

  if (side !== "buy" && side !== "sell") {
    return NextResponse.json(
      { error: "Side must be 'buy' or 'sell'" },
      { status: 400 },
    );
  }

  const amount = parseFloat(amountUsd);
  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // Ensure portfolio exists
  const existing = await db
    .select()
    .from(portfolio)
    .where(eq(portfolio.userId, user.id))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(portfolio).values({ userId: user.id });
  }

  const userPortfolio = (
    await db
      .select()
      .from(portfolio)
      .where(eq(portfolio.userId, user.id))
      .limit(1)
  )[0];

  if (amount > userPortfolio.cashBalance) {
    return NextResponse.json(
      {
        error: `Insufficient balance. Available: $${userPortfolio.cashBalance.toFixed(2)}`,
      },
      { status: 400 },
    );
  }

  // Simulate slippage: 0.01% to 0.05%
  const slippagePct = 0.01 + Math.random() * 0.04;
  const slippageMult = 1 + slippagePct / 100;

  // Resolve price: use provided price or auto-fetch best bid/ask from order book
  let basePrice = price ? parseFloat(price) : 0;
  if (!basePrice || isNaN(basePrice)) {
    try {
      const snapshot = await fetchAllOrderBooks(symbol);
      const book =
        snapshot.books.find((b) => b.exchange === exchange) ??
        snapshot.books[0]; // fallback to any live exchange
      if (!book) {
        return NextResponse.json(
          {
            error: `No order book data available for ${symbol}. All exchanges may be offline.`,
          },
          { status: 400 },
        );
      }
      if (side === "buy") {
        basePrice = book.asks[0]?.price ?? 0;
      } else {
        basePrice = book.bids[0]?.price ?? 0;
      }
    } catch {
      return NextResponse.json(
        {
          error: "Could not fetch market price. Please enter a price manually.",
        },
        { status: 400 },
      );
    }
  }

  if (isNaN(basePrice) || basePrice <= 0) {
    return NextResponse.json(
      { error: "Invalid price. Please enter a valid positive price." },
      { status: 400 },
    );
  }

  // Calculate fill price with slippage
  const fillPrice =
    side === "buy"
      ? basePrice * slippageMult // buy slightly higher
      : basePrice / slippageMult; // sell slightly lower

  const quantity = amount / fillPrice;
  const feeRate = feeRates[exchange] ?? 0.001;
  const fees = amount * feeRate;

  // For a manual buy: cash goes down, for sell: cash goes up
  const cashDelta = side === "buy" ? -(amount + fees) : amount - fees;

  try {
    // Insert trade record
    const [trade] = await db
      .insert(simulatedTrade)
      .values({
        userId: user.id,
        symbol,
        buyExchange: side === "buy" ? exchange : exchange,
        sellExchange: side === "sell" ? exchange : exchange,
        buyPrice: side === "buy" ? fillPrice : 0,
        sellPrice: side === "sell" ? fillPrice : 0,
        quantity,
        grossProfit: 0,
        fees,
        netProfit: -fees, // single-leg trades have no immediate profit
      })
      .returning();

    // Update portfolio
    await db
      .update(portfolio)
      .set({
        cashBalance: sql`${portfolio.cashBalance} + ${cashDelta}`,
        totalPnl: sql`${portfolio.totalPnl} - ${fees}`,
        tradeCount: sql`${portfolio.tradeCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(portfolio.userId, user.id));

    return NextResponse.json({
      success: true,
      tradeId: trade.id,
      fillPrice,
      quantity,
      fees,
      netCost: Math.abs(cashDelta),
      slippagePct,
      side,
      exchange,
      symbol,
    });
  } catch (err: any) {
    console.error("[/api/scan/execute-manual] DB error:", err);
    return NextResponse.json(
      { error: err.message || "Execution failed" },
      { status: 500 },
    );
  }
}
