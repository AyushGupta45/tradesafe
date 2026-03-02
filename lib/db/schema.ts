import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  json,
  serial,
} from "drizzle-orm/pg-core";

// ──────────────────────────────────────────────
// BetterAuth Tables (managed by BetterAuth)
// ──────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ──────────────────────────────────────────────
// App Tables
// ──────────────────────────────────────────────

// User watchlist — which coins to scan
export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  symbols: json("symbols")
    .$type<string[]>()
    .notNull()
    .default(["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT"]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Scan — a snapshot of prices and arbitrage opportunities
export const scan = pgTable("scan", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending | running | completed | failed
  symbols: json("symbols").$type<string[]>().notNull(),
  exchanges: json("exchanges").$type<string[]>().notNull(),
  rawPrices: json("raw_prices"), // full price snapshot from all exchanges
  opportunities: json("opportunities"), // detected arbitrage opportunities
  triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Debate — AI agent debate for an arbitrage opportunity
export const debate = pgTable("debate", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id")
    .notNull()
    .references(() => scan.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  opportunityIndex: integer("opportunity_index").notNull(),
  symbol: text("symbol").notNull(),
  buyExchange: text("buy_exchange").notNull(),
  sellExchange: text("sell_exchange").notNull(),
  spreadPercent: real("spread_percent").notNull(),
  riskAssessment: json("risk_assessment"), // risk agent output
  capitalAllocation: json("capital_allocation"), // allocation agent output
  bullishArgs: json("bullish_args"), // bull agent arguments
  bearishArgs: json("bearish_args"), // bear agent arguments
  consensus: json("consensus"), // mediator verdict + confidence
  recommendation: text("recommendation"), // execute | skip
  reasoning: text("reasoning"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Simulated trades — portfolio tracking
export const simulatedTrade = pgTable("simulated_trade", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  scanId: integer("scan_id").references(() => scan.id),
  debateId: integer("debate_id").references(() => debate.id),
  symbol: text("symbol").notNull(),
  buyExchange: text("buy_exchange").notNull(),
  sellExchange: text("sell_exchange").notNull(),
  buyPrice: real("buy_price").notNull(),
  sellPrice: real("sell_price").notNull(),
  quantity: real("quantity").notNull(),
  grossProfit: real("gross_profit").notNull(),
  fees: real("fees").notNull(),
  netProfit: real("net_profit").notNull(),
  type: text("type").notNull().default("arbitrage"), // arbitrage | manual
  side: text("side").notNull().default("buy"), // buy | sell
  status: text("status").notNull().default("filled"), // filled | pending | cancelled
  realizedPnl: real("realized_pnl").notNull().default(0),
  executedAt: timestamp("executed_at").notNull().defaultNow(),
});

// Portfolio — simulated portfolio state per user
export const portfolio = pgTable("portfolio", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  cashBalance: real("cash_balance").notNull().default(100000),
  totalPnl: real("total_pnl").notNull().default(0),
  tradeCount: integer("trade_count").notNull().default(0),
  avgEntryPrice: json("avg_entry_price")
    .$type<Record<string, number>>()
    .default({}),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Guardian settings — per-user risk/safety config
export const guardianSettings = pgTable("guardian_settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  maxTradePercent: real("max_trade_percent").notNull().default(15),
  maxDailyTrades: integer("max_daily_trades").notNull().default(30),
  maxExposurePercent: real("max_exposure_percent").notNull().default(50),
  minProfitThreshold: real("min_profit_threshold").notNull().default(0.1),
  riskScoreVeto: integer("risk_score_veto").notNull().default(75),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
