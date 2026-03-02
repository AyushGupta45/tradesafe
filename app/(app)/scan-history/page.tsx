"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  History,
  ScanSearch,
  TrendingUp,
  Target,
  Zap,
  ArrowRight,
  Loader2,
  Clock,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function ScanHistoryPage() {
  const router = useRouter();
  const [scans, setScans] = useState<ScanHistoryRecord[]>([]);
  const [stats, setStats] = useState<ScanHistoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/scans/history");
      if (res.ok) {
        const data = await res.json();
        setScans(data.scans);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch scan history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scan History</h1>
          <p className="text-muted-foreground">
            Track past arbitrage scans, hit rate, and profitability
          </p>
        </div>
        <Button onClick={() => router.push("/arbitrage")}>
          <ScanSearch className="w-4 h-4 mr-2" />
          New Scan
        </Button>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            icon={<ScanSearch className="w-4 h-4 text-primary" />}
            label="Total Scans"
            value={stats.totalScans.toString()}
          />
          <StatCard
            icon={<Target className="w-4 h-4 text-emerald-500" />}
            label="Hit Rate"
            value={`${stats.hitRate.toFixed(1)}%`}
          />
          <StatCard
            icon={<BarChart3 className="w-4 h-4 text-blue-500" />}
            label="Total Opps"
            value={stats.totalOpps.toString()}
          />
          <StatCard
            icon={<Zap className="w-4 h-4 text-yellow-500" />}
            label="Trades Executed"
            value={stats.totalTradesFromScans.toString()}
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
            label="Total Profit"
            value={`${stats.totalProfitFromScans >= 0 ? "+" : ""}$${Math.abs(stats.totalProfitFromScans).toFixed(2)}`}
            valueColor={
              stats.totalProfitFromScans >= 0
                ? "text-emerald-500"
                : "text-red-500"
            }
          />
          <StatCard
            icon={<History className="w-4 h-4 text-muted-foreground" />}
            label="With Opps"
            value={`${stats.scansWithOpps} / ${stats.totalScans}`}
          />
        </div>
      )}

      {/* Scan table */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">All Scans</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            Loading scan history…
          </div>
        ) : scans.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No scans yet. Go to Scan & Analyze to run your first scan.
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
                  <th className="px-4 py-2 font-medium text-right">Trades</th>
                  <th className="px-4 py-2 font-medium text-right">Profit</th>
                  <th className="px-4 py-2 font-medium text-right">Duration</th>
                  <th className="px-4 py-2 font-medium text-right">Time</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {scans.map((s) => (
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
                      {s.bestSpread > 0 ? `${s.bestSpread.toFixed(3)}%` : "—"}
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
                        onClick={() => router.push(`/arbitrage?scanId=${s.id}`)}
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
