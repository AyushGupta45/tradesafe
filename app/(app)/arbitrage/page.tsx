"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ScanSearch,
  Loader2,
  ArrowLeftRight,
  Shield,
  Bot,
  TrendingUp,
  TrendingDown,
  Scale,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FlaskConical,
  History,
  Target,
  BarChart3,
  ArrowRight,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Opportunity {
  id: string;
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  grossSpreadPct: number;
  netSpreadPct: number;
  estimatedFeePct: number;
  estimatedProfitUsd: number;
  confidence: number;
}

interface ScanResult {
  scanId: number;
  symbols: string[];
  liveExchanges: string[];
  failedExchanges: string[];
  opportunityCount: number;
  opportunities: Opportunity[];
  prices: Record<
    string,
    Record<string, { bid: number; ask: number; last: number }>
  >;
  timestamp: string;
}

interface DebateResult {
  debateId: number;
  verdict: "execute" | "skip";
  confidence: number;
  reasoning: string;
  riskNotes?: string[];
  riskScore: number;
  riskLevel: string;
  allocation: { amount: number; percent: number; reason: string };
  bullArgs: string;
  bearArgs: string;
  mediatorArgs: string;
  guardianVeto?: boolean;
  expectedProfit?: number;
}

interface TradeResult {
  success: boolean;
  tradeId: number;
  symbol: string;
  fillBuyPrice: number;
  fillSellPrice: number;
  quantity: number;
  grossProfit: number;
  fees: number;
  netProfit: number;
  slippagePct: number;
}

type Stage =
  | "idle"
  | "scanning"
  | "results"
  | "debating"
  | "debated"
  | "executing"
  | "executed";

interface ScanHistoryRecord {
  id: number;
  status: string;
  symbols: string[];
  exchanges: string[];
  opportunityCount: number;
  bestSpread: number;
  tradesExecuted: number;
  profitFromScan: number;
  triggeredAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

interface ScanHistoryStats {
  totalScans: number;
  scansWithOpps: number;
  hitRate: number;
  totalOpps: number;
  totalTradesFromScans: number;
  totalProfitFromScans: number;
}

export default function ArbitragePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      }
    >
      <ArbitrageContent />
    </Suspense>
  );
}

function ArbitrageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"scan" | "history">("scan");
  const [historyScans, setHistoryScans] = useState<ScanHistoryRecord[]>([]);
  const [historyStats, setHistoryStats] = useState<ScanHistoryStats | null>(
    null,
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<number | null>(null);
  const [debateResult, setDebateResult] = useState<DebateResult | null>(null);
  const [tradeResult, setTradeResult] = useState<TradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  // Load scan from URL param if present
  const loadScan = useCallback(async (scanId: string) => {
    try {
      const res = await fetch("/api/scans");
      if (!res.ok) return;
      const data = await res.json();
      const s = data.scans?.find((s: any) => s.id === parseInt(scanId));
      if (s) {
        // We need full scan data, re-fetch won't have opportunities
        // Just set the stage to results and show a "re-scan" prompt
        setStage("results");
        setScanResult({
          scanId: s.id,
          symbols: s.symbols,
          liveExchanges: s.exchanges || [],
          failedExchanges: [],
          opportunityCount: s.opportunityCount,
          opportunities: [],
          prices: s.rawPrices || {},
          timestamp: s.triggeredAt,
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    const scanId = searchParams.get("scanId");
    if (scanId) loadScan(scanId);
  }, [searchParams, loadScan]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/scans/history");
      if (res.ok) {
        const data = await res.json();
        setHistoryScans(data.scans);
        setHistoryStats(data.stats);
      }
    } catch {
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab, fetchHistory]);

  const runScan = async () => {
    setStage("scanning");
    setError(null);
    setScanResult(null);
    setSelectedOpp(null);
    setDebateResult(null);
    setTradeResult(null);
    setDemoMode(false);

    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setScanResult(data);
      setStage("results");
    } catch (err: any) {
      setError(err.message);
      setStage("idle");
    }
  };

  const runDemoScan = async () => {
    setStage("scanning");
    setError(null);
    setScanResult(null);
    setSelectedOpp(null);
    setDebateResult(null);
    setTradeResult(null);
    setDemoMode(true);

    try {
      const res = await fetch("/api/scan/demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Demo scan failed");
      setScanResult(data);
      setStage("results");
    } catch (err: any) {
      setError(err.message);
      setStage("idle");
    }
  };

  const runDebate = async (oppIndex: number) => {
    if (!scanResult) return;
    setSelectedOpp(oppIndex);
    setStage("debating");
    setDebateResult(null);
    setTradeResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/scan/${scanResult.scanId}/debate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityIndex: oppIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Debate failed");
      setDebateResult(data);
      setStage("debated");
    } catch (err: any) {
      setError(err.message);
      setStage("results");
    }
  };

  const executeTrade = async () => {
    if (!scanResult || !debateResult) return;
    setStage("executing");
    setError(null);

    try {
      const res = await fetch(`/api/scan/${scanResult.scanId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debateId: debateResult.debateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Execution failed");
      setTradeResult(data);
      setStage("executed");
    } catch (err: any) {
      setError(err.message);
      setStage("debated");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Arbitrage</h1>
          <p className="text-muted-foreground">
            Scan exchanges, debate with AI, and track scan history
          </p>
        </div>
        {activeTab === "scan" && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={runDemoScan}
              disabled={
                stage === "scanning" ||
                stage === "debating" ||
                stage === "executing"
              }
            >
              <FlaskConical className="w-4 h-4 mr-2" />
              Demo Scan
            </Button>
            <Button
              onClick={runScan}
              disabled={
                stage === "scanning" ||
                stage === "debating" ||
                stage === "executing"
              }
            >
              {stage === "scanning" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ScanSearch className="w-4 h-4 mr-2" />
              )}
              {stage === "scanning" ? "Scanning..." : "New Scan"}
            </Button>
          </div>
        )}
        {activeTab === "history" && (
          <Button
            variant="outline"
            onClick={fetchHistory}
            disabled={historyLoading}
          >
            {historyLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Clock className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "scan"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("scan")}
        >
          <ScanSearch className="w-3.5 h-3.5" />
          Scan &amp; Analyze
        </button>
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("history")}
        >
          <History className="w-3.5 h-3.5" />
          History
        </button>
      </div>

      {activeTab === "scan" && (
        <>
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {demoMode && stage !== "idle" && stage !== "scanning" && (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 shrink-0" />
              <span>
                <strong>Demo Mode</strong> — Prices are real but the opportunity
                is synthetic. The full debate → execute pipeline works normally.
              </span>
            </div>
          )}

          {/* Scanning animation */}
          {stage === "scanning" && (
            <div className="rounded-lg border bg-card p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
              <p className="font-medium">Fetching prices from 5 exchanges...</p>
              <p className="text-sm text-muted-foreground">
                Binance · Kraken · KuCoin · Bybit · Gate.io
              </p>
            </div>
          )}

          {/* Idle state */}
          {stage === "idle" && !error && (
            <div className="rounded-lg border bg-card p-12 text-center space-y-3">
              <ArrowLeftRight className="w-10 h-10 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">Ready to Scan</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Click &quot;New Scan&quot; to fetch live prices from all 5
                exchanges and detect arbitrage opportunities, or &quot;Demo
                Scan&quot; to test the full pipeline with a synthetic
                opportunity.
              </p>
            </div>
          )}

          {/* Scan Results — Opportunities Table */}
          {(stage === "results" ||
            stage === "debating" ||
            stage === "debated" ||
            stage === "executing" ||
            stage === "executed") &&
            scanResult && (
              <div className="space-y-4">
                {/* Exchange status */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Live:</span>
                  {scanResult.liveExchanges.map((e) => (
                    <span
                      key={e}
                      className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium"
                    >
                      {e}
                    </span>
                  ))}
                  {scanResult.failedExchanges.length > 0 && (
                    <>
                      <span className="text-muted-foreground ml-2">
                        Failed:
                      </span>
                      {scanResult.failedExchanges.map((e) => (
                        <span
                          key={e}
                          className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium"
                        >
                          {e}
                        </span>
                      ))}
                    </>
                  )}
                </div>

                {/* Live Prices Table */}
                {scanResult.prices &&
                  Object.keys(scanResult.prices).length > 0 && (
                    <div className="rounded-lg border bg-card">
                      <div className="p-4 border-b">
                        <h2 className="font-semibold">Live Prices</h2>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="px-4 py-2 font-medium text-muted-foreground">
                                Symbol
                              </th>
                              {scanResult.liveExchanges.map((ex) => (
                                <th
                                  key={ex}
                                  className="px-4 py-2 font-medium text-muted-foreground capitalize text-center"
                                >
                                  {ex}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {Object.entries(scanResult.prices).map(
                              ([symbol, exchangeData]) => {
                                // Find best bid (highest) and best ask (lowest) across exchanges
                                const allBids = Object.values(exchangeData)
                                  .map((d) => d.bid)
                                  .filter((b) => b > 0);
                                const allAsks = Object.values(exchangeData)
                                  .map((d) => d.ask)
                                  .filter((a) => a > 0);
                                const bestBid =
                                  allBids.length > 0 ? Math.max(...allBids) : 0;
                                const bestAsk =
                                  allAsks.length > 0 ? Math.min(...allAsks) : 0;

                                return (
                                  <tr
                                    key={symbol}
                                    className="hover:bg-accent/50 transition-colors"
                                  >
                                    <td className="px-4 py-2.5 font-medium">
                                      {symbol}
                                    </td>
                                    {scanResult.liveExchanges.map((ex) => {
                                      const d = exchangeData[ex];
                                      if (!d) {
                                        return (
                                          <td
                                            key={ex}
                                            className="px-4 py-2.5 text-center text-muted-foreground"
                                          >
                                            —
                                          </td>
                                        );
                                      }
                                      const isBestBid =
                                        d.bid === bestBid && d.bid > 0;
                                      const isBestAsk =
                                        d.ask === bestAsk && d.ask > 0;
                                      return (
                                        <td
                                          key={ex}
                                          className="px-4 py-2.5 text-center"
                                        >
                                          <div className="font-mono text-xs space-y-0.5">
                                            <div>
                                              <span className="text-muted-foreground">
                                                B:
                                              </span>{" "}
                                              <span
                                                className={
                                                  isBestBid
                                                    ? "text-emerald-500 font-semibold"
                                                    : ""
                                                }
                                              >
                                                {d.bid.toLocaleString(
                                                  undefined,
                                                  {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  },
                                                )}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground">
                                                A:
                                              </span>{" "}
                                              <span
                                                className={
                                                  isBestAsk
                                                    ? "text-blue-500 font-semibold"
                                                    : ""
                                                }
                                              >
                                                {d.ask.toLocaleString(
                                                  undefined,
                                                  {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  },
                                                )}
                                              </span>
                                            </div>
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              },
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                {/* Opportunities */}
                <div className="rounded-lg border bg-card">
                  <div className="p-4 border-b">
                    <h2 className="font-semibold">
                      Opportunities ({scanResult.opportunities.length})
                    </h2>
                  </div>
                  {scanResult.opportunities.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No arbitrage opportunities detected in this scan. Try
                      again later — spreads fluctuate constantly.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {scanResult.opportunities.map((opp, i) => (
                        <div
                          key={opp.id}
                          className={`px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors cursor-pointer ${
                            selectedOpp === i ? "bg-accent" : ""
                          }`}
                          onClick={() => {
                            if (stage !== "debating" && stage !== "executing") {
                              setSelectedOpp(i);
                            }
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-center min-w-[44px]">
                              <p className="text-xs text-muted-foreground">
                                #{i + 1}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {opp.symbol}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Buy on{" "}
                                <span className="font-medium text-foreground">
                                  {opp.buyExchange}
                                </span>{" "}
                                → Sell on{" "}
                                <span className="font-medium text-foreground">
                                  {opp.sellExchange}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <p className="text-sm font-mono font-medium text-emerald-500">
                                +{opp.netSpreadPct.toFixed(3)}%
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ~${opp.estimatedProfitUsd.toFixed(2)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                runDebate(i);
                              }}
                              disabled={
                                stage === "debating" || stage === "executing"
                              }
                            >
                              <Bot className="w-3.5 h-3.5 mr-1" />
                              Debate
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Debating animation */}
          {stage === "debating" && (
            <div className="rounded-lg border bg-card p-8 text-center space-y-3">
              <Loader2 className="w-6 h-6 mx-auto animate-spin text-purple-500" />
              <p className="font-medium">
                AI Agents are debating this opportunity...
              </p>
              <p className="text-sm text-muted-foreground">
                Bull, Bear, and Mediator agents analyzing risk, capital, and
                market conditions
              </p>
            </div>
          )}

          {/* Debate Result */}
          {(stage === "debated" ||
            stage === "executing" ||
            stage === "executed") &&
            debateResult && (
              <div className="space-y-4">
                {/* Verdict Banner */}
                <div
                  className={`rounded-lg border p-4 flex items-center justify-between ${
                    debateResult.verdict === "execute"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-orange-500/30 bg-orange-500/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {debateResult.verdict === "execute" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-orange-500" />
                    )}
                    <div>
                      <p className="font-semibold">
                        Verdict:{" "}
                        <span
                          className={
                            debateResult.verdict === "execute"
                              ? "text-emerald-500"
                              : "text-orange-500"
                          }
                        >
                          {debateResult.verdict.toUpperCase()}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Confidence: {debateResult.confidence}% · Risk:{" "}
                        {debateResult.riskLevel} ({debateResult.riskScore}/100)
                        {debateResult.guardianVeto && " · Guardian VETOED"}
                      </p>
                    </div>
                  </div>
                  {debateResult.verdict === "execute" &&
                    stage === "debated" && (
                      <Button
                        onClick={executeTrade}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Execute Trade
                      </Button>
                    )}
                  {stage === "executing" && (
                    <Button disabled>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Executing...
                    </Button>
                  )}
                </div>

                {/* Allocation */}
                {debateResult.allocation && (
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-medium text-sm">
                        Capital Allocation
                      </h3>
                    </div>
                    <p className="text-sm">
                      ${debateResult.allocation.amount.toFixed(2)} (
                      {debateResult.allocation.percent.toFixed(1)}% of
                      portfolio)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {debateResult.allocation.reason}
                    </p>
                    {debateResult.expectedProfit && (
                      <p className="text-xs text-emerald-500 mt-1">
                        Expected profit: ~$
                        {debateResult.expectedProfit.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}

                {/* Agent Arguments */}
                <div className="grid md:grid-cols-3 gap-4">
                  <AgentCard
                    icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
                    name="Bull Agent"
                    args={debateResult.bullArgs}
                    borderColor="border-emerald-500/20"
                  />
                  <AgentCard
                    icon={<TrendingDown className="w-4 h-4 text-red-500" />}
                    name="Bear Agent"
                    args={debateResult.bearArgs}
                    borderColor="border-red-500/20"
                  />
                  <AgentCard
                    icon={<Scale className="w-4 h-4 text-blue-500" />}
                    name="Mediator"
                    args={debateResult.mediatorArgs}
                    borderColor="border-blue-500/20"
                  />
                </div>

                {/* Reasoning */}
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="font-medium text-sm mb-2">Final Reasoning</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {debateResult.reasoning}
                  </p>
                  {debateResult.riskNotes &&
                    debateResult.riskNotes.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {debateResult.riskNotes.map((note, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                          >
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-yellow-500" />
                            <span>{note}</span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            )}

          {/* Trade Result */}
          {stage === "executed" && tradeResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold">Trade Executed (Simulated)</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Buy Price</p>
                  <p className="font-mono font-medium">
                    ${tradeResult.fillBuyPrice.toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sell Price</p>
                  <p className="font-mono font-medium">
                    ${tradeResult.fillSellPrice.toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-mono font-medium">
                    {tradeResult.quantity.toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Slippage</p>
                  <p className="font-mono font-medium">
                    {tradeResult.slippagePct.toFixed(4)}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 pt-2 border-t text-sm">
                <div>
                  <span className="text-muted-foreground">Gross: </span>
                  <span className="font-medium">
                    ${tradeResult.grossProfit.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fees: </span>
                  <span className="font-medium text-red-500">
                    -${tradeResult.fees.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Net Profit: </span>
                  <span
                    className={`font-bold ${
                      tradeResult.netProfit >= 0
                        ? "text-emerald-500"
                        : "text-red-500"
                    }`}
                  >
                    {tradeResult.netProfit >= 0 ? "+" : ""}$
                    {tradeResult.netProfit.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {historyStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard
                icon={<ScanSearch className="w-4 h-4 text-primary" />}
                label="Total Scans"
                value={historyStats.totalScans.toString()}
              />
              <StatCard
                icon={<Target className="w-4 h-4 text-emerald-500" />}
                label="Hit Rate"
                value={`${historyStats.hitRate.toFixed(1)}%`}
              />
              <StatCard
                icon={<BarChart3 className="w-4 h-4 text-blue-500" />}
                label="Total Opps"
                value={historyStats.totalOpps.toString()}
              />
              <StatCard
                icon={<Zap className="w-4 h-4 text-yellow-500" />}
                label="Trades Executed"
                value={historyStats.totalTradesFromScans.toString()}
              />
              <StatCard
                icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
                label="Total Profit"
                value={`${historyStats.totalProfitFromScans >= 0 ? "+" : ""}$${Math.abs(historyStats.totalProfitFromScans).toFixed(2)}`}
                valueColor={
                  historyStats.totalProfitFromScans >= 0
                    ? "text-emerald-500"
                    : "text-red-500"
                }
              />
              <StatCard
                icon={<History className="w-4 h-4 text-muted-foreground" />}
                label="With Opps"
                value={`${historyStats.scansWithOpps} / ${historyStats.totalScans}`}
              />
            </div>
          )}

          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b">
              <h2 className="font-semibold">All Scans</h2>
            </div>
            {historyLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading scan history…
              </div>
            ) : historyScans.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No scans yet. Switch to Scan &amp; Analyze to run your first
                scan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left">
                      <th className="px-4 py-2 font-medium">#</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Symbols</th>
                      <th className="px-4 py-2 font-medium text-right">Opps</th>
                      <th className="px-4 py-2 font-medium text-right">
                        Best Spread
                      </th>
                      <th className="px-4 py-2 font-medium text-right">
                        Trades
                      </th>
                      <th className="px-4 py-2 font-medium text-right">
                        Profit
                      </th>
                      <th className="px-4 py-2 font-medium text-right">
                        Duration
                      </th>
                      <th className="px-4 py-2 font-medium text-right">Time</th>
                      <th className="px-4 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {historyScans.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-accent/50 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-medium">{s.id}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              s.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : s.status === "running"
                                  ? "bg-blue-500/10 text-blue-500"
                                  : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[140px] truncate">
                          {s.symbols
                            .map((sym) => sym.replace(/USDT$/, ""))
                            .join(", ")}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span
                            className={
                              s.opportunityCount > 0
                                ? "text-emerald-500 font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {s.opportunityCount}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">
                          {s.bestSpread > 0
                            ? `${s.bestSpread.toFixed(3)}%`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {s.tradesExecuted > 0 ? s.tradesExecuted : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {s.profitFromScan !== 0 ? (
                            <span
                              className={`font-mono text-xs ${s.profitFromScan >= 0 ? "text-emerald-500" : "text-red-500"}`}
                            >
                              {s.profitFromScan >= 0 ? "+" : ""}$
                              {Math.abs(s.profitFromScan).toFixed(4)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                          {s.durationMs
                            ? `${(s.durationMs / 1000).toFixed(1)}s`
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                          {new Date(s.triggeredAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              router.push(`/arbitrage?scanId=${s.id}`);
                              setActiveTab("scan");
                            }}
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentCard({
  icon,
  name,
  args,
  borderColor,
}: {
  icon: React.ReactNode;
  name: string;
  args: string;
  borderColor: string;
}) {
  return (
    <div className={`rounded-lg border ${borderColor} bg-card p-4 space-y-2`}>
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="font-medium text-sm">{name}</h4>
      </div>
      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {args || "No arguments provided."}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`text-lg font-bold ${valueColor || ""}`}>{value}</p>
    </div>
  );
}
