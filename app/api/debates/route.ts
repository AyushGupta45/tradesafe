// GET /api/debates — Fetch user's recent debates
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { debate } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUser } from "@/lib/auth-utils";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const debates = await db
      .select()
      .from(debate)
      .where(eq(debate.userId, user.id))
      .orderBy(desc(debate.createdAt))
      .limit(30);

    return NextResponse.json({ debates });
  } catch (err: any) {
    console.error("[debates GET]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch debates" },
      { status: 500 },
    );
  }
}
