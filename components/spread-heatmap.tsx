"use client";

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

interface SpreadHeatmapProps {
  books: OrderBook[];
}

const EXCHANGE_LABELS: Record<string, string> = {
  binance: "Binance",
  kraken: "Kraken",
  kucoin: "KuCoin",
  bybit: "Bybit",
  gateio: "Gate.io",
};

function getSpreadColor(spread: number): string {
  // Tighter spread = greener, wider = more red
  if (spread <= 0.01) return "bg-emerald-500/20 text-emerald-400";
  if (spread <= 0.03) return "bg-emerald-500/15 text-emerald-500";
  if (spread <= 0.05) return "bg-yellow-500/15 text-yellow-500";
  if (spread <= 0.1) return "bg-orange-500/15 text-orange-500";
  return "bg-red-500/15 text-red-500";
}

export function SpreadHeatmap({ books }: SpreadHeatmapProps) {
  if (books.length === 0) return null;

  // Compute cross-exchange arbitrage spreads
  const bestBids = books
    .map((b) => ({ exchange: b.exchange, price: b.bids[0]?.price ?? 0 }))
    .filter((b) => b.price > 0)
    .sort((a, b) => b.price - a.price);

  const bestAsks = books
    .map((b) => ({ exchange: b.exchange, price: b.asks[0]?.price ?? 0 }))
    .filter((a) => a.price > 0)
    .sort((a, b) => a.price - b.price);

  const rows = books
    .map((book) => {
      const bid = book.bids[0]?.price ?? 0;
      const ask = book.asks[0]?.price ?? 0;
      const spread = bid > 0 && ask > 0 ? ((ask - bid) / ask) * 100 : 0;
      return {
        exchange: book.exchange,
        bid,
        ask,
        spread,
      };
    })
    .sort((a, b) => a.spread - b.spread);

  // Cross-exchange opportunity
  const crossSpread =
    bestBids.length > 0 &&
    bestAsks.length > 0 &&
    bestBids[0].exchange !== bestAsks[0].exchange
      ? ((bestBids[0].price - bestAsks[0].price) / bestAsks[0].price) * 100
      : 0;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-emerald-500 to-red-500" />
          Spread Heatmap
        </div>
        {crossSpread > 0 && (
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-medium">
            Cross-exchange: +{crossSpread.toFixed(4)}%
            <span className="text-muted-foreground ml-1">
              ({bestAsks[0].exchange} → {bestBids[0].exchange})
            </span>
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Exchange</th>
              <th className="px-3 py-2 text-right font-medium">Best Bid</th>
              <th className="px-3 py-2 text-right font-medium">Best Ask</th>
              <th className="px-3 py-2 text-right font-medium">Spread %</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr
                key={r.exchange}
                className="hover:bg-accent/50 transition-colors"
              >
                <td className="px-3 py-2 font-medium">
                  {EXCHANGE_LABELS[r.exchange] || r.exchange}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {r.bid > 0
                    ? `$${r.bid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {r.ask > 0
                    ? `$${r.ask.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <span
                    className={`px-1.5 py-0.5 rounded font-mono font-medium ${getSpreadColor(r.spread)}`}
                  >
                    {r.spread.toFixed(4)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
