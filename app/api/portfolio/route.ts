// GET /api/portfolio — Fetch user's portfolio stats
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { portfolio } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/auth-utils";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let p = await db.query.portfolio.findFirst({
      where: eq(portfolio.userId, user.id),
    });

    if (!p) {
      const [created] = await db
        .insert(portfolio)
        .values({ userId: user.id })
        .returning();
      p = created;
    }

    return NextResponse.json({
      cashBalance: p.cashBalance,
      totalPnl: p.totalPnl,
      tradeCount: p.tradeCount,
      updatedAt: p.updatedAt,
    });
  } catch (err: any) {
    console.error("[portfolio GET]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch portfolio" },
      { status: 500 },
    );
  }
}
