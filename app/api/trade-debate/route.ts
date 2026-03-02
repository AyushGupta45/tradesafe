// POST /api/trade-debate — AI advisory for a manual trade
// Uses the same LLM cascade as the arbitrage debate but adapted for single-exchange trades.

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth-utils";

// ─── LLM helpers (same cascade as debateAgent) ─────────────────────────

interface LLMProvider {
  name: string;
  url: string;
  model: string;
  apiKey: string | undefined;
  headers: () => Record<string, string>;
}

function getProviders(): LLMProvider[] {
  return [
    {
      name: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: "llama-3.3-70b-versatile",
      apiKey: process.env.GROK_KEY,
      headers() {
        return {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        };
      },
    },
    {
      name: "openrouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      model: "meta-llama/llama-3.3-70b-instruct",
      apiKey: process.env.OPENROUTER_API_KEY,
      headers() {
        return {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        };
      },
    },
    {
      name: "nvidia",
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      model: "meta/llama-3.1-70b-instruct",
      apiKey: process.env.NVIDIA_KEY,
      headers() {
        return {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        };
      },
    },
  ].filter((p) => !!p.apiKey);
}

async function callLLM(system: string, user: string): Promise<string> {
  const providers = getProviders();
  for (const provider of providers) {
    try {
      const res = await fetch(provider.url, {
        method: "POST",
        headers: provider.headers(),
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.4,
          max_tokens: 600,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
    } catch {
      continue;
    }
  }
  return "";
}

// ─── Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { symbol, exchange, side, amountUsd } = body;

  if (!symbol || !exchange || !side || !amountUsd) {
    return NextResponse.json(
      { error: "Missing required fields: symbol, exchange, side, amountUsd" },
      { status: 400 },
    );
  }

  const system = `You are an AI trading advisor for a crypto paper-trading platform.
Evaluate this proposed trade and give your verdict.
Consider: market conditions, exchange reliability, position sizing, and risk.

Respond ONLY in this exact JSON format (no other text):
{
  "verdict": "execute" | "skip",
  "confidence": <0-100>,
  "reasoning": "<1-2 sentences>",
  "riskNotes": ["<note1>", "<note2>"],
  "bullArgs": "<2-3 bullet points for the trade>",
  "bearArgs": "<2-3 bullet points against the trade>"
}`;

  const prompt = `
Trade proposal:
- ${side.toUpperCase()} ${symbol} on ${exchange}
- Amount: $${amountUsd}
- Type: Manual spot trade (simulated)

Provide your analysis.`.trim();

  try {
    const raw = await callLLM(system, prompt);

    // Parse JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        verdict: parsed.verdict === "execute" ? "execute" : "skip",
        confidence: Math.max(0, Math.min(100, parsed.confidence ?? 50)),
        reasoning: parsed.reasoning || "Analysis complete.",
        riskNotes: Array.isArray(parsed.riskNotes) ? parsed.riskNotes : [],
        bullArgs: parsed.bullArgs || "",
        bearArgs: parsed.bearArgs || "",
      });
    }

    // Fallback
    return NextResponse.json({
      verdict: "skip",
      confidence: 50,
      reasoning: "Could not generate full AI analysis — proceed with caution.",
      riskNotes: ["AI analysis was inconclusive"],
      bullArgs: "• Market opportunity exists for this pair.",
      bearArgs: "• Insufficient data for full risk assessment.",
    });
  } catch (err: any) {
    console.error("[/api/trade-debate] error:", err);
    return NextResponse.json({ error: "AI debate failed" }, { status: 500 });
  }
}
