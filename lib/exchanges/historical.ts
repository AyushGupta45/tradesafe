// Historical Klines Fetcher
// Fetches OHLCV candlestick data from all 5 exchanges for backtesting.
// Uses 1-hour candles to reconstruct approximate bid/ask prices.

import { toExchangeSymbol } from "./symbol-utils";

export interface HistoricalCandle {
  timestamp: number; // Unix ms, aligned to hour boundary
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  exchange: string;
  symbol: string; // Normalized (e.g. BTCUSDT)
}

export interface HistoricalKlineResult {
  candles: HistoricalCandle[];
  exchange: string;
  symbol: string;
  fetchedCount: number;
}

// ─── Binance ────────────────────────────────────────────────────────────

const BINANCE_HOSTS = [
  "https://api.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
  "https://api4.binance.com",
];

async function fetchBinanceKlines(
  symbol: string,
  startTime: number,
  endTime: number,
): Promise<HistoricalCandle[]> {
  const exSymbol = toExchangeSymbol(symbol, "binance");
  let lastError: unknown;

  for (const host of BINANCE_HOSTS) {
    try {
      const url = `${host}/api/v3/klines?symbol=${exSymbol}&interval=1h&startTime=${startTime}&endTime=${endTime}&limit=1000`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
      if (res.status === 451 || res.status === 403) continue;
      if (!res.ok) throw new Error(`Binance klines HTTP ${res.status}`);

      const data: any[][] = await res.json();
      return data.map((k) => ({
        timestamp: k[0] as number,
        open: parseFloat(k[1] as string),
        high: parseFloat(k[2] as string),
        low: parseFloat(k[3] as string),
        close: parseFloat(k[4] as string),
        volume: parseFloat(k[5] as string),
        exchange: "binance",
        symbol,
      }));
    } catch (err) {
      lastError = err;
    }
  }
  console.warn("[historical] Binance klines failed:", lastError);
  return [];
}

// ─── Bybit ──────────────────────────────────────────────────────────────

async function fetchBybitKlines(
  symbol: string,
  startTime: number,
  endTime: number,
): Promise<HistoricalCandle[]> {
  const exSymbol = toExchangeSymbol(symbol, "bybit");
  try {
    // Bybit v5 expects start/end in milliseconds, interval in minutes ("60" for 1h)
    const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${exSymbol}&interval=60&start=${startTime}&end=${endTime}&limit=1000`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Bybit klines HTTP ${res.status}`);

    const data = await res.json();
    if (data.retCode !== 0) throw new Error(`Bybit: retCode ${data.retCode}`);

    // Bybit returns newest first: [startTime, open, high, low, close, volume, turnover]
    const list = (data.result?.list || []) as string[][];
    return list
      .map((k) => ({
        timestamp: parseInt(k[0]),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        exchange: "bybit",
        symbol,
      }))
      .reverse(); // oldest first
  } catch (err) {
    console.warn("[historical] Bybit klines failed:", err);
    return [];
  }
}

// ─── KuCoin ─────────────────────────────────────────────────────────────

async function fetchKucoinKlines(
  symbol: string,
  startTime: number,
  endTime: number,
): Promise<HistoricalCandle[]> {
  const exSymbol = toExchangeSymbol(symbol, "kucoin");
  try {
    // KuCoin expects seconds, type "1hour"
    const startSec = Math.floor(startTime / 1000);
    const endSec = Math.floor(endTime / 1000);
    const url = `https://api.kucoin.com/api/v1/market/candles?type=1hour&symbol=${exSymbol}&startAt=${startSec}&endAt=${endSec}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`KuCoin klines HTTP ${res.status}`);

    const data = await res.json();
    if (data.code !== "200000") throw new Error(`KuCoin: code ${data.code}`);

    // KuCoin returns newest first: [time(s), open, close, high, low, volume, turnover]
    const list = (data.data || []) as string[][];
    return list
      .map((k) => ({
        timestamp: parseInt(k[0]) * 1000,
        open: parseFloat(k[1]),
        high: parseFloat(k[3]),
        low: parseFloat(k[4]),
        close: parseFloat(k[2]),
        volume: parseFloat(k[5]),
        exchange: "kucoin",
        symbol,
      }))
      .reverse(); // oldest first
  } catch (err) {
    console.warn("[historical] KuCoin klines failed:", err);
    return [];
  }
}

// ─── Gate.io ────────────────────────────────────────────────────────────

async function fetchGateioKlines(
  symbol: string,
  startTime: number,
  endTime: number,
): Promise<HistoricalCandle[]> {
  const exSymbol = toExchangeSymbol(symbol, "gateio");
  try {
    // Gate.io expects seconds, interval "1h"
    const startSec = Math.floor(startTime / 1000);
    const endSec = Math.floor(endTime / 1000);
    const url = `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${exSymbol}&interval=1h&from=${startSec}&to=${endSec}&limit=1000`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Gate.io klines HTTP ${res.status}`);

    // Gate.io returns: [timestamp(s), volume, close, high, low, open]
    const data: string[][] = await res.json();
    return data.map((k) => ({
      timestamp: parseInt(k[0]) * 1000,
      open: parseFloat(k[5]),
      high: parseFloat(k[3]),
      low: parseFloat(k[4]),
      close: parseFloat(k[2]),
      volume: parseFloat(k[1]),
      exchange: "gateio",
      symbol,
    }));
  } catch (err) {
    console.warn("[historical] Gate.io klines failed:", err);
    return [];
  }
}

// ─── Kraken ─────────────────────────────────────────────────────────────

async function fetchKrakenKlines(
  symbol: string,
  startTime: number,
): Promise<HistoricalCandle[]> {
  const exSymbol = toExchangeSymbol(symbol, "kraken");
  try {
    // Kraken: interval=60 (minutes for 1h), since=unix timestamp in seconds
    const sinceSec = Math.floor(startTime / 1000);
    const url = `https://api.kraken.com/0/public/OHLC?pair=${exSymbol}&interval=60&since=${sinceSec}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Kraken klines HTTP ${res.status}`);

    const data = await res.json();
    if (data.error?.length) throw new Error(`Kraken: ${data.error[0]}`);

    const pairKey = Object.keys(data.result || {}).find((k) => k !== "last");
    if (!pairKey) throw new Error("Kraken: no pair in result");

    // Kraken returns: [time(s), open, high, low, close, vwap, volume, count]
    const list = data.result[pairKey] as any[][];
    return list.map((k) => ({
      timestamp: (k[0] as number) * 1000,
      open: parseFloat(k[1] as string),
      high: parseFloat(k[2] as string),
      low: parseFloat(k[3] as string),
      close: parseFloat(k[4] as string),
      volume: parseFloat(k[6] as string),
      exchange: "kraken",
      symbol,
    }));
  } catch (err) {
    console.warn("[historical] Kraken klines failed:", err);
    return [];
  }
}

// ─── Aggregate Fetcher ──────────────────────────────────────────────────

export interface AllHistoricalResult {
  /** symbol → exchange → candles (sorted by timestamp asc) */
  data: Map<string, Map<string, HistoricalCandle[]>>;
  liveExchanges: string[];
  failedExchanges: string[];
  totalCandles: number;
}

const EXCHANGES = ["binance", "bybit", "kucoin", "gateio", "kraken"] as const;

type KlineFetcher = (
  symbol: string,
  startTime: number,
  endTime: number,
) => Promise<HistoricalCandle[]>;

const FETCHERS: Record<string, KlineFetcher> = {
  binance: fetchBinanceKlines,
  bybit: fetchBybitKlines,
  kucoin: fetchKucoinKlines,
  gateio: fetchGateioKlines,
  kraken: (symbol, startTime, _endTime) => fetchKrakenKlines(symbol, startTime),
};

/**
 * Fetch historical klines from all 5 exchanges for the given symbols.
 * Uses Promise.allSettled so individual failures don't block others.
 */
export async function fetchAllHistoricalKlines(
  symbols: string[],
  startTime: number,
  endTime: number,
): Promise<AllHistoricalResult> {
  const data = new Map<string, Map<string, HistoricalCandle[]>>();
  const exchangeSuccess = new Set<string>();
  const exchangeFailed = new Set<string>();
  let totalCandles = 0;

  // Build all fetch tasks: one per (symbol, exchange)
  const tasks: {
    symbol: string;
    exchange: string;
    promise: Promise<HistoricalCandle[]>;
  }[] = [];

  for (const symbol of symbols) {
    for (const exchange of EXCHANGES) {
      tasks.push({
        symbol,
        exchange,
        promise: FETCHERS[exchange](symbol, startTime, endTime),
      });
    }
  }

  const results = await Promise.allSettled(tasks.map((t) => t.promise));

  results.forEach((result, idx) => {
    const { symbol, exchange } = tasks[idx];

    if (
      result.status === "rejected" ||
      (result.status === "fulfilled" && result.value.length === 0)
    ) {
      exchangeFailed.add(exchange);
      return;
    }

    exchangeSuccess.add(exchange);
    const candles = result.value;
    totalCandles += candles.length;

    if (!data.has(symbol)) data.set(symbol, new Map());
    data.get(symbol)!.set(exchange, candles);
  });

  // An exchange is only "failed" if it never succeeded for any symbol
  const liveExchanges = Array.from(exchangeSuccess);
  const failedExchanges = Array.from(exchangeFailed).filter(
    (e) => !exchangeSuccess.has(e),
  );

  return { data, liveExchanges, failedExchanges, totalCandles };
}
