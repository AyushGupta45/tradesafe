"use client";

import { useState } from "react";
import {
  Bot,
  ArrowRightLeft,
  Loader2,
  Check,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXCHANGES } from "@/constants";

interface OrderBookLevel {
  price: number;
  quantity: number;
}

interface OrderBookData {
  exchange: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

interface TradePanelProps {
  /** Pre-selected symbol */
  symbol: string;
  /** Pre-selected exchange (optional) */
  defaultExchange?: string;
  /** Pre-selected side (optional) */
  defaultSide?: "buy" | "sell";
  /** Pre-selected price (optional) */
  defaultPrice?: number;
  /** Order book data for real-time estimator */
  books?: OrderBookData[];
}

interface DebateResult {
  verdict: string;
  confidence: number;
  reasoning: string;
  riskNotes: string[];
  bullArgs: string;
  bearArgs: string;
}

interface ExecutionResult {
  success: boolean;
  tradeId?: number;
  fillPrice: number;
  quantity: number;
  fees: number;
  netCost: number;
  slippagePct: number;
  error?: string;
}

export function TradePanel({
  symbol,
  defaultExchange,
  defaultSide,
  defaultPrice,
  books,
}: TradePanelProps) {
  const [exchange, setExchange] = useState(defaultExchange || "binance");
  const [side, setSide] = useState<"buy" | "sell">(defaultSide || "buy");
  const [amountUsd, setAmountUsd] = useState("100");
  const [price, setPrice] = useState(defaultPrice?.toString() || "");

  // AI debate state
  const [debating, setDebating] = useState(false);
  const [debate, setDebate] = useState<DebateResult | null>(null);
  const [debateError, setDebateError] = useState("");

  // Execution state
  const [executing, setExecuting] = useState(false);
  const [execution, setExecution] = useState<ExecutionResult | null>(null);
  const [execError, setExecError] = useState("");

  const runDebate = async () => {
    setDebating(true);
    setDebate(null);
    setDebateError("");
    try {
      const res = await fetch("/api/trade-debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          exchange,
          side,
          amountUsd: parseFloat(amountUsd),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setDebate(data);
    } catch (err: any) {
      setDebateError(err.message);
    } finally {
      setDebating(false);
    }
  };

  const executeTrade = async () => {
    const parsedAmount = parseFloat(amountUsd);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setExecError("Amount must be a positive number.");
      return;
    }
    const parsedPrice = price ? parseFloat(price) : undefined;
    if (parsedPrice !== undefined && (isNaN(parsedPrice) || parsedPrice <= 0)) {
      setExecError("Price must be a positive number.");
      return;
    }
    setExecuting(true);
    setExecution(null);
    setExecError("");
    try {
      const res = await fetch("/api/scan/execute-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          exchange,
          side,
          amountUsd: parsedAmount,
          price: parsedPrice,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setExecution(data);
    } catch (err: any) {
      setExecError(err.message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4" />
          Trade {symbol.replace(/USDT$/, "")}/USDT
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Side toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide("buy")}
            className={`py-2 rounded-md text-sm font-medium transition-colors ${
              side === "buy"
                ? "bg-emerald-500 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setSide("sell")}
            className={`py-2 rounded-md text-sm font-medium transition-colors ${
              side === "sell"
                ? "bg-red-500 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Sell
          </button>
        </div>

        {/* Exchange */}
        <div className="space-y-1.5">
          <Label className="text-xs">Exchange</Label>
          <select
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {EXCHANGES.map((ex) => (
              <option key={ex} value={ex}>
                {ex.charAt(0).toUpperCase() + ex.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <Label className="text-xs">Amount (USD)</Label>
          <Input
            type="number"
            value={amountUsd}
            onChange={(e) => setAmountUsd(e.target.value)}
            min="0.01"
            step="10"
            placeholder="100"
          />
        </div>

        {/* Price (optional – auto-fills from order book) */}
        <div className="space-y-1.5">
          <Label className="text-xs">
            Price (optional — leave blank for market)
          </Label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Auto (best available)"
            step="any"
          />
        </div>

        {/* Real-time P&L Estimator */}
        {(() => {
          const amt = parseFloat(amountUsd);
          if (isNaN(amt) || amt <= 0) return null;

          // Determine the effective price
          let effectivePrice = price ? parseFloat(price) : 0;
          if (!effectivePrice && books) {
            const book = books.find((b) => b.exchange === exchange) ?? books[0];
            if (book) {
              effectivePrice =
                side === "buy"
                  ? (book.asks[0]?.price ?? 0)
                  : (book.bids[0]?.price ?? 0);
            }
          }
          if (!effectivePrice || effectivePrice <= 0) return null;

          const feeRate = 0.001; // 0.1% estimate
          const slippageEst = 0.0003; // 0.03% avg
          const fillPrice =
            side === "buy"
              ? effectivePrice * (1 + slippageEst)
              : effectivePrice * (1 - slippageEst);
          const qty = amt / fillPrice;
          const fees = amt * feeRate;
          const totalCost = side === "buy" ? amt + fees : amt - fees;

          return (
            <div className="rounded-md border bg-muted/30 p-3 space-y-1.5 text-xs">
              <p className="font-medium text-muted-foreground">
                Trade Estimate
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <span className="text-muted-foreground">Est. Fill Price:</span>
                <span className="font-mono text-right">
                  $
                  {fillPrice.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-muted-foreground">Quantity:</span>
                <span className="font-mono text-right">{qty.toFixed(6)}</span>
                <span className="text-muted-foreground">
                  Est. Fees (~0.1%):
                </span>
                <span className="font-mono text-right text-red-500">
                  -${fees.toFixed(4)}
                </span>
                <span className="text-muted-foreground">
                  Net {side === "buy" ? "Cost" : "Proceeds"}:
                </span>
                <span className="font-mono text-right font-medium">
                  ${totalCost.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })()}

        {/* AI Debate */}
        <div className="pt-2 space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runDebate}
            disabled={debating}
            className="w-full"
          >
            {debating ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Bot className="w-3.5 h-3.5 mr-1.5" />
            )}
            {debating ? "AI Analyzing…" : "Ask AI Advisory"}
          </Button>

          {debateError && <p className="text-xs text-red-500">{debateError}</p>}

          {debate && (
            <div className="rounded-md border p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded font-medium ${
                    debate.verdict === "execute"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {debate.verdict.toUpperCase()}
                </span>
                <span className="text-muted-foreground">
                  {debate.confidence}% confident
                </span>
              </div>
              <p className="text-muted-foreground">{debate.reasoning}</p>
              {debate.riskNotes.length > 0 && (
                <div className="space-y-1">
                  <p className="font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-500" />
                    Risk Notes
                  </p>
                  <ul className="list-disc pl-4 text-muted-foreground">
                    {debate.riskNotes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Execute */}
        <Button
          onClick={executeTrade}
          disabled={executing || !amountUsd}
          className="w-full"
          variant={side === "buy" ? "default" : "destructive"}
        >
          {executing ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <DollarSign className="w-3.5 h-3.5 mr-1.5" />
          )}
          {executing
            ? "Executing…"
            : `${side === "buy" ? "Buy" : "Sell"} ${symbol.replace(/USDT$/, "")} (Simulated)`}
        </Button>

        {execError && <p className="text-xs text-red-500">{execError}</p>}

        {execution && (
          <div className="rounded-md border p-3 space-y-1 text-xs">
            <div className="flex items-center gap-2">
              {execution.success ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              )}
              <span className="font-medium">
                {execution.success ? "Trade Executed" : "Trade Failed"}
              </span>
            </div>
            {execution.success && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <span>Fill Price:</span>
                <span className="font-mono text-right">
                  ${execution.fillPrice.toFixed(2)}
                </span>
                <span>Quantity:</span>
                <span className="font-mono text-right">
                  {execution.quantity.toFixed(6)}
                </span>
                <span>Fees:</span>
                <span className="font-mono text-right">
                  ${execution.fees.toFixed(4)}
                </span>
                <span>Net Cost:</span>
                <span className="font-mono text-right">
                  ${execution.netCost.toFixed(2)}
                </span>
                <span>Slippage:</span>
                <span className="font-mono text-right">
                  {execution.slippagePct.toFixed(4)}%
                </span>
              </div>
            )}
            {execution.error && (
              <p className="text-red-500">{execution.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
