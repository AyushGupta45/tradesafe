// Risk Assessment Agent
// Calculates risk from real price data: spread-to-fee ratio,
// cross-exchange price volatility, and confidence scoring.

import type { Opportunity } from "@/lib/arbitrage/detector";

export interface RiskAssessmentResult {
  riskScore: number; // 0-100 (higher = riskier)
  riskLevel: "low" | "medium" | "high" | "extreme";
  spreadToFeeRatio: number;
  volatilityPct: number;
  factors: { name: string; severity: number; desc: string }[];
  recommendation: "proceed" | "caution" | "abort";
}

/**
 * Assess risk of an arbitrage opportunity using real price data.
 */
export function assessRisk(opp: Opportunity): RiskAssessmentResult {
  const factors: { name: string; severity: number; desc: string }[] = [];

  // 1. Spread-to-fee ratio — primary metric
  const spreadToFeeRatio =
    opp.estimatedFeePct > 0
      ? opp.grossSpreadPct / opp.estimatedFeePct
      : opp.grossSpreadPct * 10;

  if (spreadToFeeRatio < 1.2) {
    factors.push({
      name: "thin_margin",
      severity: 80,
      desc: `Spread barely covers fees (ratio ${spreadToFeeRatio.toFixed(2)})`,
    });
  } else if (spreadToFeeRatio < 2) {
    factors.push({
      name: "moderate_margin",
      severity: 40,
      desc: `Spread moderately above fees (ratio ${spreadToFeeRatio.toFixed(2)})`,
    });
  } else {
    factors.push({
      name: "healthy_margin",
      severity: 10,
      desc: `Healthy spread-to-fee ratio (${spreadToFeeRatio.toFixed(2)})`,
    });
  }

  // 2. Spread anomaly — extremely high spreads are suspicious
  if (opp.grossSpreadPct > 5) {
    factors.push({
      name: "anomalous_spread",
      severity: 90,
      desc: `Spread ${opp.grossSpreadPct.toFixed(2)}% is unusually high — possible stale data`,
    });
  } else if (opp.grossSpreadPct > 2) {
    factors.push({
      name: "wide_spread",
      severity: 50,
      desc: `Spread ${opp.grossSpreadPct.toFixed(2)}% is wider than typical`,
    });
  }

  // 3. Price divergence (proxy for volatility)
  const midPrice = (opp.buyPrice + opp.sellPrice) / 2;
  const divergencePct =
    (Math.abs(opp.sellPrice - opp.buyPrice) / midPrice) * 100;
  const volatilityPct = divergencePct; // simplified

  if (volatilityPct > 3) {
    factors.push({
      name: "high_volatility",
      severity: 70,
      desc: `Price divergence ${volatilityPct.toFixed(2)}% indicates high volatility`,
    });
  }

  // 4. Confidence penalty
  if (opp.confidence < 0.5) {
    factors.push({
      name: "low_confidence",
      severity: 60,
      desc: `Low opportunity confidence (${(opp.confidence * 100).toFixed(0)}%)`,
    });
  }

  // Aggregate risk score (average of all factor severities)
  const riskScore =
    factors.length > 0
      ? Math.round(
          factors.reduce((sum, f) => sum + f.severity, 0) / factors.length,
        )
      : 20;

  const riskLevel =
    riskScore > 75
      ? "extreme"
      : riskScore > 55
        ? "high"
        : riskScore > 35
          ? "medium"
          : "low";

  const recommendation =
    riskScore > 70 ? "abort" : riskScore > 45 ? "caution" : "proceed";

  return {
    riskScore,
    riskLevel,
    spreadToFeeRatio,
    volatilityPct,
    factors,
    recommendation,
  };
}
