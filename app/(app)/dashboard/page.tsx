"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  TrendingUp,
  Activity,
  ScanSearch,
  Loader2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Portfolio {
  cashBalance: number;
  totalPnl: number;
  tradeCount: number;
}

interface Scan {
  id: number;
  status: string;
  symbols: string[];
  opportunityCount: number;
  triggeredAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        fetch("/api/portfolio"),
        fetch("/api/scans"),
      ]);
      if (pRes.ok) setPortfolio(await pRes.json());
      if (sRes.ok) {
        const data = await sRes.json();
        setScans(data.scans || []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        router.push(`/arbitrage?scanId=${data.scanId}`);
      }
    } catch (err) {
      console.error("Scan failed:", err);
    } finally {
      setScanning(false);
    }
  };

  const pnlColor =
    (portfolio?.totalPnl ?? 0) >= 0 ? "text-emerald-500" : "text-red-500";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your arbitrage activity
          </p>
        </div>
        <Button onClick={handleScan} disabled={scanning}>
          {scanning ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <ScanSearch className="w-4 h-4 mr-2" />
          )}
          {scanning ? "Scanning..." : "New Scan"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Cash Balance</p>
            <p className="text-xl font-bold">
              {loading
                ? "..."
                : `$${(portfolio?.cashBalance ?? 100000).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total PnL</p>
            <p className={`text-xl font-bold ${pnlColor}`}>
              {loading
                ? "..."
                : `${(portfolio?.totalPnl ?? 0) >= 0 ? "+" : ""}$${(portfolio?.totalPnl ?? 0).toFixed(2)}`}
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Trades</p>
            <p className="text-xl font-bold">
              {loading ? "..." : (portfolio?.tradeCount ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Recent Scans</h2>
          <span className="text-xs text-muted-foreground">
            Last {scans.length} scans
          </span>
        </div>
        {scans.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <ScanSearch className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">
              No scans yet. Click &quot;New Scan&quot; to detect arbitrage
              opportunities across 6 exchanges.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {scans.slice(0, 8).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => router.push(`/arbitrage?scanId=${s.id}`)}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Scan #{s.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.triggeredAt).toLocaleString()} ·{" "}
                      {s.symbols?.length ?? 0} symbols
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.opportunityCount > 0
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.opportunityCount} opp{s.opportunityCount !== 1 && "s"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
