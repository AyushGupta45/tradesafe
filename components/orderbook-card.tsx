"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

interface OrderBookLevel {
  price: number;
  quantity: number;
}

interface OrderBook {
  exchange: string;
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

interface OrderBookCardProps {
  book: OrderBook;
  onBuy?: (exchange: string, price: number) => void;
  onSell?: (exchange: string, price: number) => void;
}

const EXCHANGE_LABELS: Record<string, string> = {
  binance: "Binance",
  kraken: "Kraken",
  kucoin: "KuCoin",
  bybit: "Bybit",
  gateio: "Gate.io",
};

function formatPrice(price: number): string {
  if (price >= 1000)
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function formatQty(qty: number): string {
  if (qty >= 1000) return qty.toFixed(2);
  if (qty >= 1) return qty.toFixed(4);
  return qty.toFixed(6);
}

export function OrderBookCard({ book, onBuy, onSell }: OrderBookCardProps) {
  const bestBid = book.bids[0]?.price ?? 0;
  const bestAsk = book.asks[0]?.price ?? 0;
  const spread =
    bestAsk > 0 && bestBid > 0 ? ((bestAsk - bestBid) / bestAsk) * 100 : 0;

  // Max quantity for volume bar scaling
  const allQty = [...book.bids, ...book.asks].map((l) => l.quantity);
  const maxQty = Math.max(...allQty, 1);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">
            {EXCHANGE_LABELS[book.exchange] || book.exchange}
          </p>
          <p className="text-xs text-muted-foreground">
            Spread: {spread.toFixed(4)}%
          </p>
        </div>
        <div className="flex gap-1.5">
          {onBuy && (
            <button
              onClick={() => onBuy(book.exchange, bestAsk)}
              className="px-3 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
            >
              Buy
            </button>
          )}
          {onSell && (
            <button
              onClick={() => onSell(book.exchange, bestBid)}
              className="px-3 py-1 rounded text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
            >
              Sell
            </button>
          )}
        </div>
      </div>

      {/* Book content */}
      <div className="grid grid-cols-2 divide-x text-xs">
        {/* Bids */}
        <div>
          <div className="grid grid-cols-2 px-3 py-1.5 text-muted-foreground border-b font-medium">
            <span>Bid Price</span>
            <span className="text-right">Qty</span>
          </div>
          {book.bids.slice(0, 8).map((level, i) => (
            <div key={i} className="grid grid-cols-2 px-3 py-1 relative">
              <div
                className="absolute inset-y-0 left-0 bg-emerald-500/8"
                style={{ width: `${(level.quantity / maxQty) * 100}%` }}
              />
              <span className="relative text-emerald-500 font-mono">
                {formatPrice(level.price)}
              </span>
              <span className="relative text-right font-mono text-muted-foreground">
                {formatQty(level.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Asks */}
        <div>
          <div className="grid grid-cols-2 px-3 py-1.5 text-muted-foreground border-b font-medium">
            <span>Ask Price</span>
            <span className="text-right">Qty</span>
          </div>
          {book.asks.slice(0, 8).map((level, i) => (
            <div key={i} className="grid grid-cols-2 px-3 py-1 relative">
              <div
                className="absolute inset-y-0 right-0 bg-red-500/8"
                style={{ width: `${(level.quantity / maxQty) * 100}%` }}
              />
              <span className="relative text-red-500 font-mono">
                {formatPrice(level.price)}
              </span>
              <span className="relative text-right font-mono text-muted-foreground">
                {formatQty(level.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
