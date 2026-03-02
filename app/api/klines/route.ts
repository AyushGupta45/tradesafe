// GET /api/klines — Fetch 12h of 15m candles from Binance REST API (no websocket)

import { NextRequest, NextResponse } from "next/server";

export interface KlineRaw {
  time: string; // ISO string
  close: number;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol") || "BTCUSDT";

  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=48`,
      { signal: AbortSignal.timeout(8000), cache: "no-store" },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Binance klines HTTP ${res.status}` },
        { status: 502 },
      );
    }

    const raw: any[][] = await res.json();

    const klines: KlineRaw[] = raw.map((k) => ({
      time: new Date(k[0] as number).toISOString(),
      close: parseFloat(k[4] as string),
    }));

    return NextResponse.json({ symbol, klines });
  } catch (err: any) {
    console.error("[/api/klines]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch klines" },
      { status: 500 },
    );
  }
}
