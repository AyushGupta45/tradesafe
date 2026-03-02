// GET/PUT /api/watchlist — Manage user's watchlist symbols

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { watchlist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_WATCHLIST } from "@/constants";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wl = await db.query.watchlist.findFirst({
      where: eq(watchlist.userId, user.id),
    });

    return NextResponse.json({
      symbols: wl?.symbols ?? DEFAULT_WATCHLIST,
    });
  } catch (err: any) {
    console.error("[watchlist GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const symbols: string[] = body.symbols;

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: "symbols must be a non-empty array" },
        { status: 400 },
      );
    }

    // Normalise
    const normalized = symbols.map((s) =>
      s.replace(/[/_-]/g, "").toUpperCase().endsWith("USDT")
        ? s.replace(/[/_-]/g, "").toUpperCase()
        : s.replace(/[/_-]/g, "").toUpperCase() + "USDT",
    );

    const existing = await db.query.watchlist.findFirst({
      where: eq(watchlist.userId, user.id),
    });

    if (existing) {
      await db
        .update(watchlist)
        .set({ symbols: normalized, updatedAt: new Date() })
        .where(eq(watchlist.userId, user.id));
    } else {
      await db.insert(watchlist).values({
        userId: user.id,
        symbols: normalized,
      });
    }

    return NextResponse.json({ symbols: normalized });
  } catch (err: any) {
    console.error("[watchlist PUT]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
