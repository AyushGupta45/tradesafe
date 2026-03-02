// GET /api/watchlist/prices — Fetch live prices for all watchlist symbols from Binance

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { watchlist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_WATCHLIST } from "@/constants";

interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wl = await db.query.watchlist.findFirst({
      where: eq(watchlist.userId, user.id),
    });
    const symbols: string[] = wl?.symbols ?? DEFAULT_WATCHLIST;

    // Fetch 24h ticker from Binance for all symbols at once
    const symbolParam = JSON.stringify(symbols);
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolParam)}`,
      { signal: AbortSignal.timeout(8000), cache: "no-store" },
    );

    if (!res.ok) {
      // Fallback: fetch individually
      const tickers: TickerData[] = [];
      for (const sym of symbols) {
        try {
          const r = await fetch(
            `https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}`,
            { signal: AbortSignal.timeout(5000), cache: "no-store" },
          );
          if (r.ok) {
            const d = await r.json();
            tickers.push({
              symbol: sym,
              price: parseFloat(d.lastPrice),
              change24h: parseFloat(d.priceChange),
              changePercent24h: parseFloat(d.priceChangePercent),
              high24h: parseFloat(d.highPrice),
              low24h: parseFloat(d.lowPrice),
              volume24h: parseFloat(d.quoteVolume),
            });
          }
        } catch {}
      }
      return NextResponse.json({ tickers });
    }

    const data: any[] = await res.json();
    const tickers: TickerData[] = data.map((d) => ({
      symbol: d.symbol,
      price: parseFloat(d.lastPrice),
      change24h: parseFloat(d.priceChange),
      changePercent24h: parseFloat(d.priceChangePercent),
      high24h: parseFloat(d.highPrice),
      low24h: parseFloat(d.lowPrice),
      volume24h: parseFloat(d.quoteVolume),
    }));

    return NextResponse.json({ tickers });
  } catch (err: any) {
    console.error("[watchlist/prices]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
