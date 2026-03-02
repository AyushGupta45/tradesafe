// Portfolio Types

export interface PortfolioStats {
  cashBalance: number;
  totalPnl: number;
  tradeCount: number;
  /** Total portfolio value (cash + holdings at current price) */
  totalValue: number;
  /** PnL as percentage of initial capital */
  pnlPercent: number;
}

export interface Holding {
  symbol: string;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  allocation: number; // percentage of total portfolio
}

export interface PnlDataPoint {
  date: string; // ISO date string
  pnl: number;
  tradeCount: number;
}

export interface TradeRecord {
  id: number;
  symbol: string;
  type: string;
  side: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  grossProfit: number;
  fees: number;
  netProfit: number;
  status: string;
  executedAt: string;
}

export interface DetailedPortfolio {
  stats: PortfolioStats;
  holdings: Holding[];
  pnlHistory: PnlDataPoint[];
  recentTrades: TradeRecord[];
}
