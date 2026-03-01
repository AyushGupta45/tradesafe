// All supported coins users can choose from for their watchlist.
// Coins that have broad support across Binance, Kraken, KuCoin, Bybit, Gate.io
export const SUPPORTED_COINS = [
  { symbol: "BTCUSDT", baseAsset: "BTC", name: "Bitcoin" },
  { symbol: "ETHUSDT", baseAsset: "ETH", name: "Ethereum" },
  { symbol: "BNBUSDT", baseAsset: "BNB", name: "Binance Coin" },
  { symbol: "SOLUSDT", baseAsset: "SOL", name: "Solana" },
  { symbol: "XRPUSDT", baseAsset: "XRP", name: "Ripple" },
  { symbol: "ADAUSDT", baseAsset: "ADA", name: "Cardano" },
  { symbol: "DOGEUSDT", baseAsset: "DOGE", name: "Dogecoin" },
  { symbol: "DOTUSDT", baseAsset: "DOT", name: "Polkadot" },
  { symbol: "AVAXUSDT", baseAsset: "AVAX", name: "Avalanche" },
  { symbol: "LINKUSDT", baseAsset: "LINK", name: "Chainlink" },
];

// Default watchlist for new users
export const DEFAULT_WATCHLIST = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT"];

// Exchange names used across the app
export const EXCHANGES = ["binance", "kraken", "kucoin", "bybit", "gateio"] as const;
export type ExchangeName = typeof EXCHANGES[number];

