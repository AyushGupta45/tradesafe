// Multi-Agent Debate System
// Three agents with distinct perspectives debate an arbitrage opportunity:
//   Bull Agent  — focuses on profit potential and opportunity cost
//   Bear Agent  — focuses on execution risk and spread decay
//   Mediator    — synthesises both and gives final recommendation
//
// Uses Groq (llama-3.3-70b-versatile) with OpenRouter and NVIDIA as fallbacks.

import type { Opportunity } from "@/lib/arbitrage/detector";
import type { RiskAssessmentResult } from "@/lib/agents/riskAssessment";
import type { AllocationResult } from "@/lib/agents/capitalAllocation";

// ─── Types ──────────────────────────────────────────────────────────────

export interface DebateResult {
  verdict: "execute" | "skip";
  confidence: number; // 0-100
  reasoning: string;
  riskNotes: string[];
  bullArgs: string;
  bearArgs: string;
  mediatorArgs: string;
}

// ─── LLM helpers ────────────────────────────────────────────────────────

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

async function callLLM(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const providers = getProviders();

  for (const provider of providers) {
    try {
      const res = await fetch(provider.url, {
        method: "POST",
        headers: provider.headers(),
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 500,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.warn(`[debate] ${provider.name} returned ${res.status}`);
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
    } catch (err) {
      console.warn(`[debate] ${provider.name} error:`, err);
    }
  }

  return ""; // all providers failed — fallback will be used
}

// ─── Agent System Prompts ───────────────────────────────────────────────

const BULL_SYSTEM = `You are the BULL AGENT in a crypto arbitrage trading system.
Your role is to argue FOR executing the trade. Focus on:
- The profit opportunity and spread size
- Historical reliability of similar cross-exchange spreads
- Exchange reliability and uptime
- Opportunity cost of NOT taking this trade
- Speed advantage if executed quickly

Be specific, data-driven, and concise (3-4 bullet points). Do NOT use markdown headers.`;

const BEAR_SYSTEM = `You are the BEAR AGENT in a crypto arbitrage trading system.
Your role is to argue AGAINST executing the trade. Focus on:
- Execution risk: slippage, withdrawal delays, network congestion
- Spread decay: how quickly the arbitrage window closes
- Exchange-specific risks: withdrawal limits, KYC holds, maintenance
- Fee underestimation: hidden fees, network gas costs
- Regulatory risk for cross-exchange transfers

Be specific, data-driven, and concise (3-4 bullet points). Do NOT use markdown headers.`;

const MEDIATOR_SYSTEM = `You are the MEDIATOR AGENT in a crypto arbitrage trading system.
You have read the Bull and Bear arguments. Your job is to:
1. Weigh both sides fairly
2. Give a FINAL VERDICT: "execute" or "skip"
3. Assign a confidence score from 0-100
4. List key risk notes

Respond ONLY in this exact JSON format (no other text):
{"verdict":"execute"|"skip","confidence":<0-100>,"reasoning":"<1 sentence>","riskNotes":["<note1>","<note2>"]}`;

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Run a 3-agent debate on a specific opportunity.
 */
export async function debateOpportunity(
  opp: Opportunity,
  risk: RiskAssessmentResult,
  allocation: AllocationResult,
): Promise<DebateResult> {
  const context = `
Symbol: ${opp.symbol}
Buy from: ${opp.buyExchange} at $${opp.buyPrice.toFixed(2)}
Sell on: ${opp.sellExchange} at $${opp.sellPrice.toFixed(2)}
Gross spread: ${opp.grossSpreadPct.toFixed(3)}%
Net spread (after fees): ${opp.netSpreadPct.toFixed(3)}%
Estimated fees: ${opp.estimatedFeePct.toFixed(3)}%
Risk score: ${risk.riskScore}/100 (${risk.riskLevel})
Spread-to-fee ratio: ${risk.spreadToFeeRatio.toFixed(2)}
Suggested allocation: $${allocation.allocatedUsd.toFixed(2)} (${allocation.allocationPct}%)
Expected profit on allocation: $${((allocation.allocatedUsd * opp.netSpreadPct) / 100).toFixed(2)}
`.trim();

  // Run bull and bear in parallel
  const [bullRaw, bearRaw] = await Promise.all([
    callLLM(BULL_SYSTEM, `Evaluate this arbitrage opportunity:\n${context}`),
    callLLM(BEAR_SYSTEM, `Evaluate this arbitrage opportunity:\n${context}`),
  ]);

  const bullArgs = bullRaw || fallbackBull(opp, risk);
  const bearArgs = bearRaw || fallbackBear(opp, risk);

  // Mediator sees both arguments
  const mediatorPrompt = `
OPPORTUNITY:
${context}

BULL ARGUMENT:
${bullArgs}

BEAR ARGUMENT:
${bearArgs}

Give your final verdict as JSON.`;

  const mediatorRaw = await callLLM(MEDIATOR_SYSTEM, mediatorPrompt);
  let mediatorArgs = mediatorRaw;

  // Parse mediator JSON
  let verdict: "execute" | "skip" = "skip";
  let confidence = 50;
  let reasoning = "Unable to reach consensus";
  let riskNotes: string[] = [];

  try {
    const jsonMatch = mediatorRaw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      verdict = parsed.verdict === "execute" ? "execute" : "skip";
      confidence = Math.max(0, Math.min(100, parsed.confidence ?? 50));
      reasoning = parsed.reasoning || reasoning;
      riskNotes = Array.isArray(parsed.riskNotes) ? parsed.riskNotes : [];
    }
  } catch {
    // Fallback: use risk score to decide
    verdict =
      risk.riskScore < 50 && opp.netSpreadPct > 0.1 ? "execute" : "skip";
    confidence = Math.round(100 - risk.riskScore);
    reasoning = `Fallback decision based on risk score ${risk.riskScore}/100`;
    riskNotes = risk.factors.map((f) => f.desc);
    mediatorArgs = JSON.stringify({
      verdict,
      confidence,
      reasoning,
      riskNotes,
    });
  }

  return {
    verdict,
    confidence,
    reasoning,
    riskNotes,
    bullArgs,
    bearArgs,
    mediatorArgs,
  };
}

// ─── Fallbacks ──────────────────────────────────────────────────────────

function fallbackBull(opp: Opportunity, risk: RiskAssessmentResult): string {
  return [
    `• ${opp.netSpreadPct.toFixed(3)}% net spread after fees provides a real profit margin.`,
    `• Buying on ${opp.buyExchange} and selling on ${opp.sellExchange} are both major, liquid exchanges.`,
    `• Spread-to-fee ratio of ${risk.spreadToFeeRatio.toFixed(2)}x means fees are well covered.`,
    `• Delaying risks losing the window — arbitrage spreads can close in seconds.`,
  ].join("\n");
}

function fallbackBear(opp: Opportunity, risk: RiskAssessmentResult): string {
  return [
    `• Execution across two exchanges means timing risk — prices can change mid-transfer.`,
    `• Risk score of ${risk.riskScore}/100 indicates ${risk.riskLevel} risk level.`,
    `• Hidden costs (withdrawal fees, network gas, slippage) may erode the ${opp.grossSpreadPct.toFixed(3)}% spread.`,
    `• Cross-exchange arbitrage requires pre-funded accounts on both sides.`,
  ].join("\n");
}
