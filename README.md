# TradeSafe

AI-powered cryptocurrency arbitrage platform. Detects price spreads across 6 exchanges, runs a multi-agent debate (Bull / Bear / Mediator) via LLM, and simulates execution — all in real time.

## Architecture

```
Next.js 14 (App Router)  →  Drizzle ORM  →  Neon PostgreSQL
        ↓
  6 Exchange Adapters (Binance, Kraken, KuCoin, Bybit, OKX, Gate.io)
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
- **LLM:** Cascading fallback — Groq → OpenRouter → NVIDIA (Llama 3 70B)

## Pages

| Route               | Description                               |
| ------------------- | ----------------------------------------- |
| `/`                 | Landing page                              |
| `/login`, `/signup` | Authentication                            |
| `/dashboard`        | Portfolio stats, recent scans             |
| `/arbitrage`        | Scan → prices → debate → execute workflow |
| `/portfolio`        | Holdings and simulated trade history      |
| `/agents`           | Agent activity and debate history         |
| `/settings`         | Watchlist and guardian risk parameters    |

## API Routes

| Method  | Route                        | Description                             |
| ------- | ---------------------------- | --------------------------------------- |
| POST    | `/api/scan`                  | Trigger price scan across all exchanges |
| POST    | `/api/scan/[scanId]/debate`  | Run 3-agent debate on an opportunity    |
| POST    | `/api/scan/[scanId]/execute` | Simulate trade execution                |
| GET     | `/api/scans`                 | List user's past scans                  |
| GET     | `/api/debates`               | List user's debate history              |
| GET     | `/api/trades`                | List user's simulated trades            |
| GET     | `/api/portfolio`             | Get portfolio holdings                  |
| GET/PUT | `/api/settings/watchlist`    | Manage watchlist symbols                |
| GET/PUT | `/api/settings/guardian`     | Manage risk guardian parameters         |

## Exchange Adapters

All 6 adapters share a common `ExchangeAdapter` interface and are called in parallel via `Promise.allSettled`:

- **Binance** — Book ticker API (bid/ask/mid)
- **Kraken** — Public ticker API
- **KuCoin** — All tickers endpoint
- **Bybit** — v5 spot tickers
- **OKX** — Spot tickers (with `aws.okx.com` fallback for geo-blocked regions)
- **Gate.io** — Spot tickers

## Agent Pipeline

1. **Price Discovery** — Fetch all exchange prices, compute cross-exchange spreads
2. **Arbitrage Detector** — Filter opportunities by minimum net spread (>0.05%)
3. **Risk Assessment** — Score risk factors (spread volatility, exchange reliability, etc.)
4. **Guardian Check** — Veto trades that exceed user-configured risk thresholds
5. **Capital Allocation** — Determine position size based on risk tier
6. **AI Debate** — Bull, Bear, and Mediator agents argue via LLM; mediator renders verdict
7. **Simulated Execution** — Model slippage, fill prices, fees; update portfolio in DB

## Setup

```bash
# Install dependencies
npm install

# Copy environment file and fill in values
cp "sample .env.local" .env.local

# Push database schema
npm run db:push

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
- `scan` — Scan results with raw prices and opportunities
- `debate` — AI debate transcripts and verdicts
- `simulatedTrade` — Execution simulation results
- `portfolio` — User holdings (cash + positions)
- `guardianSettings` — Per-user risk thresholds

```bash
# Generate migrations
npm run db:generate

# Push schema to database
npm run db:push

# Open Drizzle Studio
npm run db:studio
```
