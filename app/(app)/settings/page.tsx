"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User, Shield, Eye, Save, Loader2, Check } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SymbolSearch } from "@/components/symbol-search";

interface GuardianSettings {
  maxTradePercent: number;
  maxDailyTrades: number;
  maxExposurePercent: number;
  minProfitThreshold: number;
  riskScoreVeto: number;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Watchlist state
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [wlLoading, setWlLoading] = useState(true);
  const [wlSaving, setWlSaving] = useState(false);
  const [wlSaved, setWlSaved] = useState(false);

  // Guardian state
  const [guardian, setGuardian] = useState<GuardianSettings>({
    maxTradePercent: 15,
    maxDailyTrades: 30,
    maxExposurePercent: 50,
    minProfitThreshold: 0.1,
    riskScoreVeto: 75,
  });
  const [gLoading, setGLoading] = useState(true);
  const [gSaving, setGSaving] = useState(false);
  const [gSaved, setGSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const [wlRes, gRes] = await Promise.all([
        fetch("/api/settings/watchlist"),
        fetch("/api/settings/guardian"),
      ]);
      if (wlRes.ok) {
        const data = await wlRes.json();
        setWatchlist(data.symbols || []);
      }
      if (gRes.ok) {
        const data = await gRes.json();
        setGuardian(data);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setWlLoading(false);
      setGLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveWatchlist = async () => {
    setWlSaving(true);
    setWlSaved(false);
    try {
      const res = await fetch("/api/settings/watchlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: watchlist }),
      });
      if (res.ok) setWlSaved(true);
    } catch {}
    setWlSaving(false);
    setTimeout(() => setWlSaved(false), 2000);
  };

  const saveGuardian = async () => {
    setGSaving(true);
    setGSaved(false);
    try {
      const res = await fetch("/api/settings/guardian", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guardian),
      });
      if (res.ok) setGSaved(true);
    } catch {}
    setGSaving(false);
    setTimeout(() => setGSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, watchlist, and risk parameters
        </p>
      </div>

      {/* Profile */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Profile</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium">{session?.user?.name || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{session?.user?.email || "—"}</p>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      {/* Watchlist */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-500" />
            <h2 className="font-semibold">Watchlist</h2>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={saveWatchlist}
            disabled={wlSaving}
          >
            {wlSaving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : wlSaved ? (
              <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1" />
            )}
            {wlSaved ? "Saved" : "Save"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Select which coin pairs to scan across exchanges.
        </p>
        {wlLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <SymbolSearch
            selected={watchlist}
            onSelectionChange={setWatchlist}
            maxSelections={20}
          />
        )}
      </div>

      {/* Guardian Settings */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-yellow-500" />
            <h2 className="font-semibold">Guardian Settings</h2>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={saveGuardian}
            disabled={gSaving}
          >
            {gSaving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : gSaved ? (
              <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1" />
            )}
            {gSaved ? "Saved" : "Save"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Risk management parameters that protect your simulated portfolio.
        </p>
        {gLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Max Trade % of Portfolio</Label>
              <Input
                type="number"
                value={guardian.maxTradePercent}
                onChange={(e) =>
                  setGuardian({
                    ...guardian,
                    maxTradePercent: Number(e.target.value),
                  })
                }
                min={1}
                max={50}
                step={1}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Daily Trades</Label>
              <Input
                type="number"
                value={guardian.maxDailyTrades}
                onChange={(e) =>
                  setGuardian({
                    ...guardian,
                    maxDailyTrades: Number(e.target.value),
                  })
                }
                min={1}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Exposure %</Label>
              <Input
                type="number"
                value={guardian.maxExposurePercent}
                onChange={(e) =>
                  setGuardian({
                    ...guardian,
                    maxExposurePercent: Number(e.target.value),
                  })
                }
                min={5}
                max={100}
                step={5}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Min Profit Threshold %</Label>
              <Input
                type="number"
                value={guardian.minProfitThreshold}
                onChange={(e) =>
                  setGuardian({
                    ...guardian,
                    minProfitThreshold: Number(e.target.value),
                  })
                }
                min={0}
                max={5}
                step={0.01}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">
                Risk Score Veto Threshold (0-100 — debates with risk ≥ this are
                auto-skipped)
              </Label>
              <Input
                type="number"
                value={guardian.riskScoreVeto}
                onChange={(e) =>
                  setGuardian({
                    ...guardian,
                    riskScoreVeto: Number(e.target.value),
                  })
                }
                min={0}
                max={100}
                step={5}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
