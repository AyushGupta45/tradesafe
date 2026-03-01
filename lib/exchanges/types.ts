// Shared types for all exchange adapters

export interface PriceData {
  symbol: string; // Normalized: BTCUSDT
  exchange: string; // Exchange id: binance, kraken, etc.
  bid: number; // Best bid price
  ask: number; // Best ask price
  last: number; // Last traded price (mid if unavailable)
  timestamp: number; // Unix ms
}

export interface ExchangeAdapter {
  name: string;
  fetchPrices(symbols: string[]): Promise<PriceData[]>;
  /** Maker/taker fee as a fraction, e.g. 0.001 = 0.1% */
  feeRate: number;
}
