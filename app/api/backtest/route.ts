// POST /api/backtest — Run an arbitrage backtest over historical data
// 1. Validate session
// 2. Read user watchlist (or use default)
// 3. Fetch historical klines from all 5 exchanges
// 4. Run backtest engine (simulate arbitrage detection)
// 5. Return aggregated results

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { watchlist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/auth-utils";
import { fetchAllHistoricalKlines } from "@/lib/exchanges/historical";
import { runBacktest } from "@/lib/arbitrage/backtester";
import { DEFAULT_WATCHLIST } from "@/constants";

const VALID_DURATIONS = [1, 3, 7, 14, 30];

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const durationDays: number = body.durationDays ?? 7;
    const requestedSymbols: string[] | undefined = body.symbols;

    if (!VALID_DURATIONS.includes(durationDays)) {
      return NextResponse.json(
        {
          error: `Invalid duration. Must be one of: ${VALID_DURATIONS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Get symbols — use requested, user's watchlist, or default
    let symbols: string[];
    if (requestedSymbols && requestedSymbols.length > 0) {
      symbols = requestedSymbols;
    } else {
      const wl = await db.query.watchlist.findFirst({
        where: eq(watchlist.userId, user.id),
      });
      symbols = wl?.symbols ?? DEFAULT_WATCHLIST;
    }

    // Limit to 5 symbols max for performance
    symbols = symbols.slice(0, 5);

    // Calculate time range
    const endTime = Date.now();
    const startTime = endTime - durationDays * 24 * 60 * 60 * 1000;

    // Fetch historical klines from all exchanges
    const historicalData = await fetchAllHistoricalKlines(
      symbols,
      startTime,
      endTime,
    );

    if (historicalData.totalCandles === 0) {
      return NextResponse.json(
        { error: "No historical data available. All exchanges failed." },
        { status: 502 },
      );
    }

    // Run backtest
    const result = runBacktest(historicalData, symbols, durationDays);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[backtest] error:", err);
    return NextResponse.json(
      { error: err.message || "Backtest failed" },
      { status: 500 },
    );
  }
}
