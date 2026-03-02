// GET /api/symbols — Returns all USDT-paired trading symbols from Binance
// Cached 1hr in-memory via symbol-utils

import { NextResponse } from "next/server";
import { fetchBinanceSymbols } from "@/lib/exchanges/symbol-utils";

export async function GET() {
  try {
    const symbols = await fetchBinanceSymbols();
    return NextResponse.json({ symbols, count: symbols.length });
  } catch (err: any) {
    console.error("[/api/symbols] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch symbols" },
      { status: 500 },
    );
  }
}
