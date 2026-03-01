// GET /api/scans — Fetch user's recent scans
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scan } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUser } from "@/lib/auth-utils";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scans = await db
      .select({
        id: scan.id,
        status: scan.status,
        symbols: scan.symbols,
        exchanges: scan.exchanges,
        opportunityCount: scan.opportunities,
        triggeredAt: scan.triggeredAt,
        completedAt: scan.completedAt,
      })
      .from(scan)
      .where(eq(scan.userId, user.id))
      .orderBy(desc(scan.triggeredAt))
      .limit(20);

    // Massage the data — opportunities is stored as JSON array, extract count
    const result = scans.map((s) => ({
      ...s,
      opportunityCount: Array.isArray(s.opportunityCount)
        ? s.opportunityCount.length
        : 0,
    }));

    return NextResponse.json({ scans: result });
  } catch (err: any) {
    console.error("[scans GET]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch scans" },
      { status: 500 },
    );
  }
}
