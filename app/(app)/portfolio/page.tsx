"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wallet,
  TrendingUp,
  History,
  ArrowUpRight,
  ArrowDownRight,
  PieChartIcon,
  LineChart as LineChartIcon,
  Filter,
  DollarSign,
  Target,
  Shield,
  Flame,
  Trophy,
} from "lucide-react";
import { PortfolioPie } from "@/components/charts/portfolio-pie";
import { PnlLine } from "@/components/charts/pnl-line";

import type { DetailedPortfolio, TradeRecord } from "@/types/portfolio";

interface Analytics {
  winRate: number;
  avgProfitPerTrade: number;
  totalFees: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
  profitableTrades: number;
  unprofitableTrades: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  tradeCount: number;
}

export default function PortfolioPage() {
  const [data, setData] = useState<DetailedPortfolio | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "arbitrage" | "manual">(
    "all",
  );
  const [sideFilter, setSideFilter] = useState<"all" | "buy" | "sell">("all");

  const fetchData = useCallback(async () => {
    try {
      const [pRes, aRes] = await Promise.all([
        fetch("/api/portfolio/detailed"),
        fetch("/api/portfolio/analytics"),
      ]);
      if (pRes.ok) setData(await pRes.json());
      if (aRes.ok) setAnalytics(await aRes.json());
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = data?.stats;
  const pnl = stats?.totalPnl ?? 0;
  const pnlColor = pnl >= 0 ? "text-emerald-500" : "text-red-500";
  const pnlSign = pnl >= 0 ? "+" : "";
  const pnlPct = stats?.pnlPercent ?? 0;

  // Filter trades
  const filteredTrades =
    data?.recentTrades.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (sideFilter !== "all" && t.side !== sideFilter) return false;
      return true;
    }) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-muted-foreground">
          Simulated portfolio performance, holdings, and trade history
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <p className="text-sm text-muted-foreground">Total Value</p>
          </div>
          <p className="text-2xl font-bold">
            {loading
              ? "..."
              : `$${(stats?.totalValue ?? 100000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-blue-500" />
            <p className="text-sm text-muted-foreground">Cash Balance</p>
          </div>
          <p className="text-2xl font-bold">
            {loading
              ? "..."
              : `$${(stats?.cashBalance ?? 100000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
          {!loading && (
            <p className={`text-xs mt-0.5 ${pnlColor}`}>
              {pnlSign}
              {Math.abs(pnlPct).toFixed(2)}%
            </p>
          )}
        </div>
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Total Trades</p>
          </div>
          <p className="text-2xl font-bold">
            {loading ? "..." : (stats?.tradeCount ?? 0)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PnL Line Chart */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <LineChartIcon className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">PnL Over Time</h2>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : (
            <PnlLine data={data?.pnlHistory ?? []} />
          )}
        </div>

        {/* Portfolio Pie Chart */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Allocation</h2>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : (
            <PortfolioPie
              holdings={data?.holdings ?? []}
              cashBalance={stats?.cashBalance ?? 100000}
            />
          )}
        </div>
      </div>

      {/* Analytics Panel */}
      {analytics && analytics.tradeCount > 0 && (
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Performance Analytics</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <AnalyticCard
              icon={<Trophy className="w-3.5 h-3.5 text-yellow-500" />}
              label="Win Rate"
              value={`${analytics.winRate}%`}
              valueColor={
                analytics.winRate >= 50 ? "text-emerald-500" : "text-red-500"
              }
            />
            <AnalyticCard
              icon={<DollarSign className="w-3.5 h-3.5 text-emerald-500" />}
              label="Avg Profit/Trade"
              value={`$${analytics.avgProfitPerTrade.toFixed(4)}`}
              valueColor={
                analytics.avgProfitPerTrade >= 0
                  ? "text-emerald-500"
                  : "text-red-500"
              }
            />
            <AnalyticCard
              icon={<Shield className="w-3.5 h-3.5 text-blue-500" />}
              label="Max Drawdown"
              value={`${analytics.maxDrawdown}%`}
              valueColor="text-red-500"
            />
            <AnalyticCard
              icon={<Flame className="w-3.5 h-3.5 text-orange-500" />}
              label="Profit Factor"
              value={
                analytics.profitFactor >= 999
                  ? "∞"
                  : analytics.profitFactor.toFixed(2)
              }
              valueColor={
                analytics.profitFactor >= 1
                  ? "text-emerald-500"
                  : "text-red-500"
              }
            />
            <AnalyticCard
              icon={<ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />}
              label="Best Trade"
              value={`$${analytics.bestTrade.toFixed(4)}`}
              valueColor="text-emerald-500"
            />
            <AnalyticCard
              icon={<ArrowDownRight className="w-3.5 h-3.5 text-red-500" />}
              label="Worst Trade"
              value={`$${analytics.worstTrade.toFixed(4)}`}
              valueColor="text-red-500"
            />
          </div>
          <div className="mt-3 pt-3 border-t flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>
              Winners: {analytics.profitableTrades} (avg $
              {analytics.avgWin.toFixed(4)})
            </span>
            <span>
              Losers: {analytics.unprofitableTrades} (avg $
              {analytics.avgLoss.toFixed(4)})
            </span>
            <span>Total Fees: ${analytics.totalFees.toFixed(4)}</span>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      {data && data.holdings.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Holdings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="px-4 py-2 font-medium">Symbol</th>
                  <th className="px-4 py-2 font-medium text-right">Quantity</th>
                  <th className="px-4 py-2 font-medium text-right">
                    Avg Entry
                  </th>
                  <th className="px-4 py-2 font-medium text-right">
                    Market Value
                  </th>
                  <th className="px-4 py-2 font-medium text-right">
                    Allocation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.holdings.map((h) => (
                  <tr
                    key={h.symbol}
                    className="hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {h.symbol.replace(/USDT$/, "")}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {h.quantity.toFixed(6)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      ${h.avgEntryPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      ${h.marketValue.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {h.allocation.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trade History */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-semibold">Trade History</h2>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="rounded-md border bg-background px-2 py-1 text-xs"
            >
              <option value="all">All Types</option>
              <option value="arbitrage">Arbitrage</option>
              <option value="manual">Manual</option>
            </select>
            <select
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value as any)}
              className="rounded-md border bg-background px-2 py-1 text-xs"
            >
              <option value="all">All Sides</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
        </div>
        {filteredTrades.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {data?.recentTrades.length === 0
              ? "No trades yet. Use Scan & Analyze or Trade to execute opportunities."
              : "No trades match the current filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="px-4 py-2 font-medium">Symbol</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Side</th>
                  <th className="px-4 py-2 font-medium">Exchange</th>
                  <th className="px-4 py-2 font-medium text-right">Price</th>
                  <th className="px-4 py-2 font-medium text-right">Qty</th>
                  <th className="px-4 py-2 font-medium text-right">Net P&L</th>
                  <th className="px-4 py-2 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTrades.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {t.symbol.replace(/USDT$/, "")}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          t.type === "arbitrage"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-violet-500/10 text-violet-500"
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          t.side === "buy"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {t.side}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {t.type === "arbitrage"
                        ? `${t.buyExchange} → ${t.sellExchange}`
                        : t.side === "buy"
                          ? t.buyExchange
                          : t.sellExchange}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      $
                      {(t.side === "buy" ? t.buyPrice : t.sellPrice).toFixed(2)}
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
                    <td className="px-4 py-2.5 text-right text-muted-foreground text-xs">
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

function AnalyticCard({
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
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-sm font-bold font-mono ${valueColor || ""}`}>
        {value}
      </p>
    </div>
  );
}
