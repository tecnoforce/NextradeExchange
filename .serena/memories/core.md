# NexTrade Core

Crypto exchange web app replicating Binance UI with real-time Binance Testnet data via CCXT and local matching engine.

## Entry Points

- `server/index.js` — Express + HTTP + Socket.io server bootstrap
- `public/trade.html` — Main trading page (4-column layout)
- `public/index.html` — Login/Register
- `public/wallet.html` — Wallet balances and movements
- `public/orders.html` — Order and trade history

## Key Directories

- `server/config/` — DB config, exchange config (CCXT), constants (20 pairs, 16 timeframes, fees)
- `server/models/` — Sequelize models: User, Order, Trade, Transaction
- `server/services/` — priceService, matchingEngine, orderBookService, notificationService
- `server/routes/` — REST endpoints (auth, market, orders, wallet, user)
- `server/socket/` — Socket.io handler with pair-based rooms
- `public/js/` — Frontend: api, socket, chart, orderbook, orderform, trade orchestrator, wallet
- `public/css/` — Dark theme CSS (Binance replica)
- `scripts/seed.js` — DB seeding with demo users and balances

## Data Modes

- `DATA_SOURCE=real` — Binance Testnet via CCXT (requires API keys)
- `DATA_SOURCE=simulated` — Random walk price generation (offline dev)

## Single-User Mode

App works without login. Opens `trade.html` with demo user ID: `00000000-0000-0000-0000-000000000001`

## Architecture

Browser ↔ Socket.io ↔ Server (Express + Socket) ↔ CCXT ↔ Binance Testnet
Local: matchingEngine ↔ orderBookService ↔ SQLite/Sequelize

## Socket Channels

- `ticker:{PAIR}` — current price (bid, ask, last, change)
- `orderbook:{PAIR}` — bids/asks 20 levels
- `trades:{PAIR}` — recent trades
- `user:{USER_ID}` — user notifications (orders, balances)
- `chart:{PAIR}:{TIMEFRAME}` — OHLCV data

## Important Notes

- Binance Testnet resets ~monthly
- CCXT v4.5.38+ still points to old Testnet URLs; `server/config/exchange.js` overrides manually
- Matching engine is local FIFO — orders match between platform users, NOT against Binance
- SQLite for dev; migrate to PostgreSQL for production
- No bundler — frontend deps loaded from CDN
