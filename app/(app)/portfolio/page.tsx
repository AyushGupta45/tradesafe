"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wallet,
  TrendingUp,
  History,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface Portfolio {
  cashBalance: number;
  totalPnl: number;
  tradeCount: number;
}

interface Trade {
  id: number;
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  grossProfit: number;
  fees: number;
  netProfit: number;
  executedAt: string;
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        fetch("/api/portfolio"),
        fetch("/api/trades"),
      ]);
      if (pRes.ok) setPortfolio(await pRes.json());
      if (tRes.ok) {
        const data = await tRes.json();
        setTrades(data.trades || []);
      }
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pnl = portfolio?.totalPnl ?? 0;
  const pnlColor = pnl >= 0 ? "text-emerald-500" : "text-red-500";
  const pnlSign = pnl >= 0 ? "+" : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-muted-foreground">
          Simulated portfolio and trade history
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-primary" />
            <p className="text-sm text-muted-foreground">Cash Balance</p>
          </div>
          <p className="text-2xl font-bold">
            {loading
              ? "..."
              : `$${(portfolio?.cashBalance ?? 100000).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <p className="text-sm text-muted-foreground">Total PnL</p>
          </div>
          <p className={`text-2xl font-bold ${pnlColor}`}>
            {loading ? "..." : `${pnlSign}$${Math.abs(pnl).toFixed(2)}`}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Total Trades</p>
          </div>
          <p className="text-2xl font-bold">
            {loading ? "..." : (portfolio?.tradeCount ?? 0)}
          </p>
        </div>
      </div>

      {/* Trades Table */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Trade History</h2>
        </div>
        {trades.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No trades yet. Use Scan &amp; Analyze to detect and execute
            opportunities.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="px-4 py-2 font-medium">Symbol</th>
                  <th className="px-4 py-2 font-medium">Buy → Sell</th>
                  <th className="px-4 py-2 font-medium text-right">
                    Buy Price
                  </th>
                  <th className="px-4 py-2 font-medium text-right">
                    Sell Price
                  </th>
                  <th className="px-4 py-2 font-medium text-right">Qty</th>
                  <th className="px-4 py-2 font-medium text-right">Net P&L</th>
                  <th className="px-4 py-2 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {trades.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium">{t.symbol}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {t.buyExchange} → {t.sellExchange}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      ${t.buyPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      ${t.sellPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {t.quantity.toFixed(6)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          t.netProfit >= 0 ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {t.netProfit >= 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        ${Math.abs(t.netProfit).toFixed(4)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {new Date(t.executedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
