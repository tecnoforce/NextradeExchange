# Tech Stack

## Runtime

- Node.js v20+ (required)
- npm package manager

## Backend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | HTTP server |
| socket.io | ^4.7.2 | Real-time WebSocket communication |
| ccxt | ^4.5.38 | Unified crypto exchange API (Binance Testnet) |
| sequelize | ^6.37.7 | ORM for SQLite |
| sqlite3 | ^5.1.6 | SQLite driver |
| dotenv | ^16.3.1 | Environment variables |
| cors | ^2.8.5 | CORS middleware |
| helmet | ^7.1.0 | Security headers |
| express-rate-limit | ^7.1.5 | IP-based rate limiting |
| express-validator | ^7.0.1 | Request validation |
| node-cron | ^3.0.3 | Scheduled tasks |
| uuid | ^9.0.1 | Unique IDs |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| nodemon | ^3.0.2 | Auto-restart on file changes |
| playwright | ^1.60.0 | E2E testing |

## Frontend (no bundler)

- HTML5 + CSS3 + vanilla JavaScript
- TradingView Lightweight Charts v5 (CDN)
- CDN-loaded dependencies (no webpack/vite)

## Auth

- JWT (JSON Web Tokens) + bcrypt

## Database

- SQLite (dev) → PostgreSQL (production migration path)

## Key Version Notes

- CCXT v4.5.38+ has old Binance Testnet URLs; manually overridden in `server/config/exchange.js`
- Lightweight Charts v5 API differs from v4; check docs for series/indicator options
