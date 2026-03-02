"use client";

import { useState, useCallback, useEffect } from "react";
import {
  BookOpen,
  RefreshCw,
  Loader2,
  Search,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderBookCard } from "@/components/orderbook-card";
import { TradePanel } from "@/components/trade-panel";
import { SpreadHeatmap } from "@/components/spread-heatmap";
import { ExchangeHealth } from "@/components/exchange-health";
import {
  MiniPriceChart,
  type KlinePoint,
} from "@/components/charts/mini-price-chart";

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

interface OrderBookData {
  symbol: string;
  books: OrderBook[];
  liveExchanges: string[];
  failedExchanges: string[];
  timestamp: number;
}

export default function TradePage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [inputSymbol, setInputSymbol] = useState("BTC");
  const [data, setData] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Trade panel pre-fill state
  const [tradeExchange, setTradeExchange] = useState<string | undefined>();
  const [tradeSide, setTradeSide] = useState<"buy" | "sell" | undefined>();
  const [tradePrice, setTradePrice] = useState<number | undefined>();

  // Klines state
  const [klines, setKlines] = useState<KlinePoint[]>([]);
  const [klinesLoading, setKlinesLoading] = useState(false);

  const fetchKlines = useCallback(async (sym: string) => {
    setKlinesLoading(true);
    try {
      const res = await fetch(`/api/klines?symbol=${sym}`);
      if (res.ok) {
        const d = await res.json();
        setKlines(d.klines ?? []);
      }
    } catch {
      // non-critical
    } finally {
      setKlinesLoading(false);
    }
  }, []);

  const fetchOrderBooks = useCallback(
    async (sym?: string) => {
      const target = sym || symbol;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/orderbook?symbol=${target}`);
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || `HTTP ${res.status}`);
        }
        const result = await res.json();
        setData(result);
        setSymbol(target);
        fetchKlines(target);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [symbol],
  );

  // Auto-fetch on mount
  useEffect(() => {
    fetchOrderBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    const normalized = inputSymbol
      .replace("/", "")
      .replace("-", "")
      .replace("_", "")
      .toUpperCase();
    const full = normalized.endsWith("USDT") ? normalized : `${normalized}USDT`;
    fetchOrderBooks(full);
  };

  const handleBuy = (exchange: string, price: number) => {
    setTradeExchange(exchange);
    setTradeSide("buy");
    setTradePrice(price);
  };

  const handleSell = (exchange: string, price: number) => {
    setTradeExchange(exchange);
    setTradeSide("sell");
    setTradePrice(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trade</h1>
          <p className="text-muted-foreground">
            View real-time order books and execute simulated trades
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="BTC, ETH, SOL…"
              className="pl-8 w-40"
            />
          </div>
          <Button size="sm" onClick={handleSearch} disabled={loading}>
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
          </Button>
          {data && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchOrderBooks()}
              disabled={loading}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          )}
        </div>
      </div>

      {/* Symbol badge + Exchange Health */}
      {data && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="px-3 py-1 rounded-md bg-primary text-primary-foreground font-medium">
              {symbol.replace(/USDT$/, "")}/USDT
            </span>
            <span className="text-muted-foreground">
              {data.liveExchanges.length} exchanges live
              {data.failedExchanges.length > 0 && (
                <span className="text-yellow-500 ml-2">
                  ({data.failedExchanges.length} failed:{" "}
                  {data.failedExchanges.join(", ")})
                </span>
              )}
            </span>
          </div>
          <ExchangeHealth
            liveExchanges={data.liveExchanges}
            failedExchanges={data.failedExchanges}
          />
        </div>
      )}

      {/* Mini Price Chart */}
      {(klines.length > 0 || klinesLoading) && (
        <MiniPriceChart data={klines} loading={klinesLoading} symbol={symbol} />
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main content: Order books + Trade panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Order books (3 cols) */}
        <div className="xl:col-span-3 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpen className="w-4 h-4 text-primary" />
            Order Books
          </div>
          {!data && !loading && !error && (
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-sm">
              Enter a symbol and press search to view order books across
              exchanges.
            </div>
          )}
          {loading && !data && (
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-sm">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Fetching order books…
            </div>
          )}
          {data && data.books.length === 0 && (
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground text-sm">
              No order book data returned. This symbol may not be listed on any
              exchange.
            </div>
          )}
          {data && data.books.length > 0 && (
            <div className="space-y-4">
              {/* First row: up to 3 books */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.books.slice(0, 3).map((book) => (
                  <OrderBookCard
                    key={book.exchange}
                    book={book}
                    onBuy={handleBuy}
                    onSell={handleSell}
                  />
                ))}
              </div>
              {/* Second row: remaining books, centered */}
              {data.books.length > 3 && (
                <div className="flex justify-center gap-4">
                  {data.books.slice(3).map((book) => (
                    <div
                      key={book.exchange}
                      className="w-full lg:max-w-[calc(33.333%-0.667rem)]"
                    >
                      <OrderBookCard
                        book={book}
                        onBuy={handleBuy}
                        onSell={handleSell}
                      />
                    </div>
                  ))}
                </div>
              )}
              {/* Spread Heatmap */}
              <SpreadHeatmap books={data.books} />
            </div>
          )}
        </div>

        {/* Trade panel (1 col) */}
        <div>
          <TradePanel
            symbol={symbol}
            defaultExchange={tradeExchange}
            defaultSide={tradeSide}
            defaultPrice={tradePrice}
            books={data?.books}
          />
        </div>
      </div>
    </div>
  );
}
