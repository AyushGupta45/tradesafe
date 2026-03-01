// Capital Allocation Agent
// Determines how much capital to allocate to an opportunity
// based on risk level and portfolio state.

import type { Opportunity } from "@/lib/arbitrage/detector";
import type { RiskAssessmentResult } from "@/lib/agents/riskAssessment";

export interface PortfolioState {
  cashBalance: number;
  totalPnl: number;
  tradeCount: number;
}

export interface AllocationResult {
  allocatedUsd: number;
  allocationPct: number;
  reason: string;
}

/**
 * Allocate capital for a single opportunity based on its risk.
 */
export function allocateCapitalForOpportunity(
  opp: Opportunity,
  risk: RiskAssessmentResult,
  portfolio: PortfolioState,
  maxTradePercent: number = 15,
): AllocationResult {
  const maxAllocation = portfolio.cashBalance * (maxTradePercent / 100);

  let pct: number;
  let reason: string;

  if (risk.riskScore > 75) {
    pct = 2;
    reason = `Extreme risk (${risk.riskScore}) — minimal 2% allocation`;
  } else if (risk.riskScore > 55) {
    pct = 5;
    reason = `High risk (${risk.riskScore}) — conservative 5% allocation`;
  } else if (risk.riskScore > 35) {
    pct = 10;
    reason = `Medium risk (${risk.riskScore}) — moderate 10% allocation`;
  } else {
    pct = 15;
    reason = `Low risk (${risk.riskScore}) — aggressive 15% allocation`;
  }

  const raw = portfolio.cashBalance * (pct / 100);
  const allocatedUsd = Math.min(raw, maxAllocation);

  if (allocatedUsd < raw) {
    reason += `. Capped at guardian limit ($${allocatedUsd.toFixed(2)})`;
  }

  return {
    allocatedUsd,
    allocationPct: pct,
    reason,
  };
}
