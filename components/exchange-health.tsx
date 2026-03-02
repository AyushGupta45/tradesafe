"use client";

import { Wifi, WifiOff } from "lucide-react";

interface ExchangeHealthProps {
  liveExchanges: string[];
  failedExchanges: string[];
}

const EXCHANGE_LABELS: Record<string, string> = {
  binance: "Binance",
  kraken: "Kraken",
  kucoin: "KuCoin",
  bybit: "Bybit",
  gateio: "Gate.io",
};

export function ExchangeHealth({
  liveExchanges,
  failedExchanges,
}: ExchangeHealthProps) {
  if (liveExchanges.length === 0 && failedExchanges.length === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Wifi className="w-3 h-3" />
        <span>Exchanges:</span>
      </div>
      {liveExchanges.map((ex) => (
        <div key={ex} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium">
            {EXCHANGE_LABELS[ex] || ex}
          </span>
        </div>
      ))}
      {failedExchanges.map((ex) => (
        <div key={ex} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs font-medium text-muted-foreground line-through">
            {EXCHANGE_LABELS[ex] || ex}
          </span>
        </div>
      ))}
      <span className="text-xs text-muted-foreground">
        {liveExchanges.length}/{liveExchanges.length + failedExchanges.length}{" "}
        online
      </span>
    </div>
  );
}
