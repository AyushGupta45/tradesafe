// Symbol Utilities
// Normalises symbols between exchanges and provides a dynamic symbol list
// fetched from Binance's exchangeInfo endpoint.

export interface SymbolInfo {
  /** Normalised symbol, e.g. "BTCUSDT" */
  symbol: string;
  /** Base asset, e.g. "BTC" */
  baseAsset: string;
  /** Quote asset, e.g. "USDT" */
  quoteAsset: string;
}

// ─── Exchange-specific symbol conversion ────────────────────────────────

/** Kraken uses non-standard names for some assets */
const KRAKEN_BASE_MAP: Record<string, string> = {
  BTC: "XBT",
  DOGE: "XDG",
};
const KRAKEN_BASE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(KRAKEN_BASE_MAP).map(([k, v]) => [v, k]),
);

/**
 * Convert normalised symbol (BTCUSDT) to exchange-specific format.
 */
export function toExchangeSymbol(symbol: string, exchange: string): string {
  const clean = symbol.replace("/", "").toUpperCase();
  const base = clean.replace(/USDT$/, "");
  const quote = "USDT";

  switch (exchange) {
    case "binance":
    case "bybit":
      return `${base}${quote}`;
    case "kraken":
      return `${KRAKEN_BASE_MAP[base] || base}${quote}`;
    case "kucoin":
      return `${base}-${quote}`;
    case "gateio":
      return `${base}_${quote}`;
    default:
      return `${base}${quote}`;
  }
}

/**
 * Convert exchange-specific symbol back to normalised form (BTCUSDT).
 */
export function fromExchangeSymbol(symbol: string, exchange: string): string {
  switch (exchange) {
    case "kucoin":
      return symbol.replace("-", "");
    case "gateio":
      return symbol.replace("_", "");
    case "kraken": {
      const base = symbol.replace(/USDT$/, "");
      const normBase = KRAKEN_BASE_REVERSE[base] || base;
      return `${normBase}USDT`;
    }
    default:
      return symbol;
  }
}

// ─── Binance exchangeInfo fetcher ───────────────────────────────────────

const BINANCE_INFO_URL = "https://api.binance.com/api/v3/exchangeInfo";

/** In-memory cache to avoid hammering Binance */
let symbolCache: SymbolInfo[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface BinanceSymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
}

/**
 * Fetch all USDT-paired, actively-trading symbols from Binance exchangeInfo.
 * Cached for 1 hour.
 */
export async function fetchBinanceSymbols(): Promise<SymbolInfo[]> {
  if (symbolCache && Date.now() < cacheExpiry) return symbolCache;

  try {
    const res = await fetch(BINANCE_INFO_URL, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Binance exchangeInfo HTTP ${res.status}`);

    const data: { symbols: BinanceSymbolInfo[] } = await res.json();

    symbolCache = data.symbols
      .filter(
        (s) =>
          s.quoteAsset === "USDT" &&
          s.status === "TRADING" &&
          !s.baseAsset.endsWith("DOWN") &&
          !s.baseAsset.endsWith("UP") &&
          !s.baseAsset.endsWith("BEAR") &&
          !s.baseAsset.endsWith("BULL"),
      )
      .map((s) => ({
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
      }))
      .sort((a, b) => a.baseAsset.localeCompare(b.baseAsset));

    cacheExpiry = Date.now() + CACHE_TTL;
    return symbolCache;
  } catch (err) {
    console.error("[symbol-utils] Failed to fetch Binance exchangeInfo:", err);
    // Return cache even if expired, or empty
    return symbolCache ?? [];
  }
}
