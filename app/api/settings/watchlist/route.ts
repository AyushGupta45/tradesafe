// GET /api/settings/watchlist — Fetch user's watchlist
// PUT /api/settings/watchlist — Update user's watchlist
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { watchlist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/auth-utils";
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

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const symbols: string[] = body.symbols;

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: "symbols must be a non-empty array" },
        { status: 400 },
      );
    }

    const existing = await db.query.watchlist.findFirst({
      where: eq(watchlist.userId, user.id),
    });

    if (existing) {
      await db
        .update(watchlist)
        .set({ symbols, updatedAt: new Date() })
        .where(eq(watchlist.userId, user.id));
    } else {
      await db.insert(watchlist).values({ userId: user.id, symbols });
    }

    return NextResponse.json({ symbols });
  } catch (err: any) {
    console.error("[watchlist PUT]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
