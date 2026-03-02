# TradeSafe

AI-powered cryptocurrency arbitrage platform. Detects price spreads across 5 exchanges, runs a multi-agent debate (Bull / Bear / Mediator) via LLM, and simulates execution — all in real time.

## Architecture

```
Next.js 14 (App Router)  →  Drizzle ORM  →  Neon PostgreSQL
        ↓
  5 Exchange Adapters (Binance, Kraken, KuCoin, Bybit, Gate.io)
        ↓
  Price Discovery  →  Arbitrage Detector  →  Risk Assessment
        ↓
  3-Agent LLM Debate (Groq → OpenRouter → NVIDIA cascade)
        ↓
  Capital Allocation  →  Simulated Execution  →  Portfolio DB
```

### Tech Stack

- **Framework:** Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Auth:** BetterAuth (email/password + Google OAuth)
- **Database:** Neon PostgreSQL via Drizzle ORM
- **UI:** shadcn/ui primitives, Lucide icons, next-themes (dark/light)
- **Charts:** Recharts (portfolio P&L, allocation pie, mini price sparklines)
- **LLM:** Cascading fallback — Groq → OpenRouter → NVIDIA (Llama 3 70B)

## Pages

| Route        | Description                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------- |
| `/`          | Landing page                                                                                    |
| `/login`     | Email/password or Google OAuth login                                                            |
| `/signup`    | Account creation                                                                                |
| `/dashboard` | Portfolio stats, live watchlist tickers with 24h change/volume, recent scan activity            |
| `/arbitrage` | **Scan & Analyze** tab: live scan → AI debate → execute; **History** tab: past scans with stats |
| `/trade`     | Manual trading — symbol search, live order books from 5 exchanges, AI debate, P&L estimator     |
| `/portfolio` | Holdings, full trade history, analytics panel (win rate, drawdown, profit factor)               |
| `/agents`    | Agent roster with descriptions and full debate history                                          |
| `/settings`  | Watchlist symbols and Guardian risk thresholds                                                  |

## API Routes

### Arbitrage Pipeline

| Method | Route                        | Description                                    |
| ------ | ---------------------------- | ---------------------------------------------- |
| POST   | `/api/scan`                  | Trigger live price scan across all 5 exchanges |
| POST   | `/api/scan/demo`             | Demo scan — real prices, synthetic opportunity |
| POST   | `/api/scan/[scanId]/debate`  | Run 3-agent LLM debate on an opportunity       |
| POST   | `/api/scan/[scanId]/execute` | Simulate arbitrage execution, persist to DB    |
| GET    | `/api/scans`                 | List user's past scans                         |
| GET    | `/api/scans/history`         | Enriched scan history with hit-rate stats      |

### Manual Trading

| Method | Route                      | Description                                             |
| ------ | -------------------------- | ------------------------------------------------------- |
| GET    | `/api/orderbook`           | Live order books (bid/ask ladders) from all 5 exchanges |
| GET    | `/api/symbols`             | Dynamic tradeable symbol list pulled from Binance       |
| GET    | `/api/klines`              | OHLCV kline data for mini price sparkline charts        |
| POST   | `/api/trade-debate`        | AI debate on a manual trade before execution            |
| POST   | `/api/scan/execute-manual` | Execute a manual buy/sell and update portfolio in DB    |

### Portfolio & Watchlist

| Method | Route                      | Description                                                     |
| ------ | -------------------------- | --------------------------------------------------------------- |
| GET    | `/api/portfolio`           | Portfolio summary (cash, PnL, trade count)                      |
| GET    | `/api/portfolio/detailed`  | Full holdings — assets, open positions, trade list              |
| GET    | `/api/portfolio/analytics` | Win rate, avg profit, max drawdown, profit factor, best/worst   |
| GET    | `/api/watchlist`           | Get user's watchlist symbols                                    |
| PUT    | `/api/watchlist`           | Update watchlist symbols                                        |
| GET    | `/api/watchlist/prices`    | Live price tickers for watchlist (24h change, high/low, volume) |

### Settings & Misc

| Method  | Route                     | Description                     |
| ------- | ------------------------- | ------------------------------- |
| GET     | `/api/debates`            | List user's debate history      |
| GET     | `/api/trades`             | List user's simulated trades    |
| GET/PUT | `/api/settings/watchlist` | Manage watchlist symbols        |
| GET/PUT | `/api/settings/guardian`  | Manage Guardian risk parameters |
| POST    | `/api/admin/seed`         | Insert demo data via HTTP       |

## Exchange Adapters

All adapters share a common `ExchangeAdapter` interface and are called in parallel via `Promise.allSettled` — a single failing exchange never blocks a scan:

- **Binance** — Book ticker API (bid/ask/mid)
- **Kraken** — Public ticker API
- **KuCoin** — All tickers endpoint
- **Bybit** — v5 spot tickers
- **Gate.io** — Spot tickers

## Agent Pipeline

1. **Price Discovery** — Fetch all exchange prices, compute cross-exchange spreads
2. **Arbitrage Detector** — Filter opportunities by minimum net spread (>0.05%)
3. **Risk Assessment** — Score risk factors (spread volatility, exchange reliability, etc.)
4. **Guardian Check** — Veto trades that exceed user-configured risk thresholds
5. **Capital Allocation** — Tiered position sizing (extreme → 2%, high → 5%, medium → 10%, low → 15%)
6. **AI Debate** — Bull, Bear, and Mediator agents argue via LLM; mediator renders verdict + confidence score
7. **Simulated Execution** — Models slippage (0.01–0.05%), fee deduction; persists result to portfolio DB

## Key UI Components

| Component                                | Description                                                           |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `components/spread-heatmap.tsx`          | Grid heatmap of bid/ask spreads across all exchange pairs             |
| `components/exchange-health.tsx`         | Live status badges showing latency and reachability per exchange      |
| `components/charts/mini-price-chart.tsx` | Inline kline sparkline rendered on the trade page                     |
| `components/trade-panel.tsx`             | Trade form with real-time P&L estimator using live order book depth   |
| Portfolio analytics panel                | KPI cards — win rate, avg profit, max drawdown, profit factor         |
| Dashboard watchlist                      | Live 24h price rows with change %, high/low, volume, quick-trade link |
| Arbitrage History tab                    | Paginated scan log with per-scan opportunity, trade, and profit stats |

## Setup

```bash
# Install dependencies
npm install

# Copy environment file and fill in values
cp "sample .env.local" .env.local

# Push database schema
npm run db:push

# Seed demo data (optional — requires at least one registered account)
npm run db:seed

# Start development server
npm run dev
```

## Environment Variables

| Variable               | Description                             |
| ---------------------- | --------------------------------------- |
| `DATABASE_URL`         | Neon PostgreSQL connection string       |
| `BETTER_AUTH_SECRET`   | Random secret for session signing       |
| `BETTER_AUTH_URL`      | App URL (http://localhost:3000 for dev) |
| `NEXT_PUBLIC_APP_URL`  | Public app URL                          |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                  |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret              |
| `GROK_KEY`             | Groq API key (primary LLM provider)     |
| `OPENROUTER_API_KEY`   | OpenRouter API key (fallback)           |
| `NVIDIA_KEY`           | NVIDIA NIM API key (last fallback)      |

## Database

10 tables managed by Drizzle ORM:

- `user`, `session`, `account`, `verification` — BetterAuth core
- `watchlist` — Per-user symbol watchlist
- `scan` — Scan results with raw prices and opportunities JSON
- `debate` — AI debate transcripts and verdicts
- `simulatedTrade` — Execution results for both arbitrage and manual trades
- `portfolio` — User cash balance, total PnL, trade count
- `guardianSettings` — Per-user risk thresholds

```bash
# Generate migrations
npm run db:generate

# Push schema to database
npm run db:push

# Open Drizzle Studio
npm run db:studio

# Seed realistic demo data (7 scans, 18 trades, ~$308 PnL)
npm run db:seed
```

## Demo Walkthrough

After running `npm run db:seed` (register an account first):

1. **Dashboard** — watchlist tickers update live; portfolio shows seeded PnL and trade count
2. **Arbitrage → History** — 7 past scans with hit-rate, opportunity count, and profit aggregates
3. **Arbitrage → Scan & Analyze** — click _Demo Scan_ to run the full pipeline with a synthetic opportunity, then _Debate_ → _Execute_
4. **Trade** — search a symbol (e.g. `BTC`), view live order books across 5 exchanges, run AI debate, inspect P&L estimator before submitting
5. **Portfolio** — allocation pie chart, KPI analytics panel, full trade log with arbitrage and manual trades
6. **Agents** — full debate history with Bull / Bear / Mediator arguments, verdicts, and confidence scores
