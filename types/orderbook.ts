// Order Book Types

export interface OrderBookLevel {
  /** Price level */
  price: number;
  /** Quantity at this price level */
  quantity: number;
}

export interface OrderBook {
  /** Exchange name */
  exchange: string;
  /** Normalised symbol, e.g. "BTCUSDT" */
  symbol: string;
  /** Bid levels sorted descending by price (best bid first) */
  bids: OrderBookLevel[];
  /** Ask levels sorted ascending by price (best ask first) */
  asks: OrderBookLevel[];
  /** Unix timestamp ms */
  timestamp: number;
}

export interface OrderBookSnapshot {
  symbol: string;
  books: OrderBook[];
  /** Which exchanges responded */
  liveExchanges: string[];
  /** Which exchanges failed */
  failedExchanges: string[];
  timestamp: number;
}
