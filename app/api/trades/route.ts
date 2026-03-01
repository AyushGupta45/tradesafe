// GET /api/trades — Fetch user's simulated trade history
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { simulatedTrade } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUser } from "@/lib/auth-utils";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trades = await db
      .select()
      .from(simulatedTrade)
      .where(eq(simulatedTrade.userId, user.id))
      .orderBy(desc(simulatedTrade.executedAt))
      .limit(50);

    return NextResponse.json({ trades });
  } catch (err: any) {
    console.error("[trades GET]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch trades" },
      { status: 500 },
    );
  }
}
