// Order Book Fetcher — fetches depth/order book data from all 5 exchanges
// Each adapter fetches the top N levels of bids and asks.

import type {
  OrderBook,
  OrderBookLevel,
  OrderBookSnapshot,
} from "@/types/orderbook";
import { toExchangeSymbol } from "./symbol-utils";

const DEPTH = 5; // how many levels to return

// ─── Binance ────────────────────────────────────────────────────────────

async function fetchBinanceBook(symbol: string): Promise<OrderBook> {
  const exSymbol = toExchangeSymbol(symbol, "binance");
  const res = await fetch(
    `https://api.binance.com/api/v3/depth?symbol=${exSymbol}&limit=${DEPTH}`,
    { signal: AbortSignal.timeout(8000), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Binance depth HTTP ${res.status}`);
  const data = await res.json();

  return {
    exchange: "binance",
    symbol,
    bids: (data.bids as string[][]).map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })),
    asks: (data.asks as string[][]).map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })),
    timestamp: Date.now(),
  };
}

// ─── Kraken ─────────────────────────────────────────────────────────────

async function fetchKrakenBook(symbol: string): Promise<OrderBook> {
  const exSymbol = toExchangeSymbol(symbol, "kraken");
  const res = await fetch(
    `https://api.kraken.com/0/public/Depth?pair=${exSymbol}&count=${DEPTH}`,
    { signal: AbortSignal.timeout(8000), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Kraken depth HTTP ${res.status}`);
  const data = await res.json();

  if (data.error?.length) throw new Error(`Kraken: ${data.error[0]}`);

  const pairKey = Object.keys(data.result || {})[0];
  if (!pairKey) throw new Error("Kraken: no pair in result");

  const book = data.result[pairKey];
  return {
    exchange: "kraken",
    symbol,
    bids: (book.bids as [string, string, string][]).map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })),
    asks: (book.asks as [string, string, string][]).map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })),
    timestamp: Date.now(),
  };
}

// ─── KuCoin ─────────────────────────────────────────────────────────────

async function fetchKucoinBook(symbol: string): Promise<OrderBook> {
  const exSymbol = toExchangeSymbol(symbol, "kucoin");
  const res = await fetch(
    `https://api.kucoin.com/api/v1/market/orderbook/level2_20?symbol=${exSymbol}`,
    { signal: AbortSignal.timeout(8000), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`KuCoin depth HTTP ${res.status}`);
  const data = await res.json();
  if (data.code !== "200000") throw new Error(`KuCoin: code ${data.code}`);

  return {
    exchange: "kucoin",
    symbol,
    bids: (data.data.bids as string[][]).slice(0, DEPTH).map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })),
    asks: (data.data.asks as string[][]).slice(0, DEPTH).map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })),
    timestamp: Date.now(),
  };
}

// ─── Bybit ──────────────────────────────────────────────────────────────

async function fetchBybitBook(symbol: string): Promise<OrderBook> {
  const exSymbol = toExchangeSymbol(symbol, "bybit");
  const res = await fetch(
    `https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${exSymbol}&limit=${DEPTH}`,
    { signal: AbortSignal.timeout(8000), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Bybit depth HTTP ${res.status}`);
  const data = await res.json();

  if (data.retCode !== 0) throw new Error(`Bybit: retCode ${data.retCode}`);

  return {
    exchange: "bybit",
    symbol,
    bids: (data.result.b as string[][]).map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })),
    asks: (data.result.a as string[][]).map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })),
    timestamp: Date.now(),
  };
}

// ─── Gate.io ────────────────────────────────────────────────────────────

async function fetchGateioBook(symbol: string): Promise<OrderBook> {
  const exSymbol = toExchangeSymbol(symbol, "gateio");
  const res = await fetch(
    `https://api.gateio.ws/api/v4/spot/order_book?currency_pair=${exSymbol}&limit=${DEPTH}`,
    { signal: AbortSignal.timeout(8000), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Gate.io depth HTTP ${res.status}`);
  const data = await res.json();

  return {
    exchange: "gateio",
    symbol,
    bids: (data.bids as string[][]).map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })),
    asks: (data.asks as string[][]).map(([p, q]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })),
    timestamp: Date.now(),
  };
}

// ─── Aggregate fetcher ──────────────────────────────────────────────────

type BookFetcher = (symbol: string) => Promise<OrderBook>;

const FETCHERS: { name: string; fn: BookFetcher }[] = [
  { name: "binance", fn: fetchBinanceBook },
  { name: "kraken", fn: fetchKrakenBook },
  { name: "kucoin", fn: fetchKucoinBook },
  { name: "bybit", fn: fetchBybitBook },
  { name: "gateio", fn: fetchGateioBook },
];

/**
 * Fetch order books for a single symbol from all exchanges.
 * Uses Promise.allSettled so one failure doesn't block others.
 */
export async function fetchAllOrderBooks(
  symbol: string,
): Promise<OrderBookSnapshot> {
  const results = await Promise.allSettled(FETCHERS.map((f) => f.fn(symbol)));

  const books: OrderBook[] = [];
  const liveExchanges: string[] = [];
  const failedExchanges: string[] = [];

  results.forEach((result, idx) => {
    const name = FETCHERS[idx].name;
    if (result.status === "fulfilled") {
      books.push(result.value);
      liveExchanges.push(name);
    } else {
      console.warn(`[orderbook] ${name} failed:`, result.reason);
      failedExchanges.push(name);
    }
  });

  return {
    symbol,
    books,
    liveExchanges,
    failedExchanges,
    timestamp: Date.now(),
  };
}
