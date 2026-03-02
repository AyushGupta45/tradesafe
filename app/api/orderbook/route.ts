// GET /api/orderbook?symbol=BTCUSDT — Fetch order books from all exchanges

import { NextRequest, NextResponse } from "next/server";
import { fetchAllOrderBooks } from "@/lib/exchanges/orderbook";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams
    .get("symbol")
    ?.replace("/", "")
    .toUpperCase();

  if (!symbol) {
    return NextResponse.json(
      { error: "Missing ?symbol= parameter" },
      { status: 400 },
    );
  }

  try {
    const snapshot = await fetchAllOrderBooks(symbol);

    // Convert to plain JSON-safe objects
    const books = snapshot.books.map((b) => ({
      exchange: b.exchange,
      symbol: b.symbol,
      bids: b.bids,
      asks: b.asks,
      timestamp: b.timestamp,
    }));

    return NextResponse.json({
      symbol: snapshot.symbol,
      books,
      liveExchanges: snapshot.liveExchanges,
      failedExchanges: snapshot.failedExchanges,
      timestamp: snapshot.timestamp,
    });
  } catch (err: any) {
    console.error("[/api/orderbook] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch order books" },
      { status: 500 },
    );
  }
}
