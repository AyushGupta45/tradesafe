// GET /api/settings/guardian — Fetch user's guardian settings
// PUT /api/settings/guardian — Update guardian settings
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardianSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/auth-utils";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let gs = await db.query.guardianSettings.findFirst({
      where: eq(guardianSettings.userId, user.id),
    });

    if (!gs) {
      const [created] = await db
        .insert(guardianSettings)
        .values({ userId: user.id })
        .returning();
      gs = created;
    }

    return NextResponse.json({
      maxTradePercent: gs.maxTradePercent,
      maxDailyTrades: gs.maxDailyTrades,
      maxExposurePercent: gs.maxExposurePercent,
      minProfitThreshold: gs.minProfitThreshold,
      riskScoreVeto: gs.riskScoreVeto,
    });
  } catch (err: any) {
    console.error("[guardian GET]", err);
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
    const updates: Record<string, any> = {};

    if (body.maxTradePercent !== undefined)
      updates.maxTradePercent = Number(body.maxTradePercent);
    if (body.maxDailyTrades !== undefined)
      updates.maxDailyTrades = Number(body.maxDailyTrades);
    if (body.maxExposurePercent !== undefined)
      updates.maxExposurePercent = Number(body.maxExposurePercent);
    if (body.minProfitThreshold !== undefined)
      updates.minProfitThreshold = Number(body.minProfitThreshold);
    if (body.riskScoreVeto !== undefined)
      updates.riskScoreVeto = Number(body.riskScoreVeto);

    updates.updatedAt = new Date();

    const existing = await db.query.guardianSettings.findFirst({
      where: eq(guardianSettings.userId, user.id),
    });

    if (existing) {
      await db
        .update(guardianSettings)
        .set(updates)
        .where(eq(guardianSettings.userId, user.id));
    } else {
      await db.insert(guardianSettings).values({ userId: user.id, ...updates });
    }

    return NextResponse.json({ success: true, ...updates });
  } catch (err: any) {
    console.error("[guardian PUT]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
