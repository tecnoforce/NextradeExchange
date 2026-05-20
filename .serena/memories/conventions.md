# Conventions

## Code Style

- JavaScript: template strings, async/await, `module.exports`, camelCase for variables/functions
- No bundler — frontend loads dependencies from CDN
- No ES modules — use CommonJS (`require`/`module.exports`) throughout

## Naming

- Backend: camelCase for functions/variables, PascalCase for classes/models
- Files: camelCase for JS files, kebab-case for CSS files
- Routes: RESTful with plural nouns (`/api/orders`, `/api/wallet/balances`)
- Socket channels: lowercase with colon separator (`ticker:{PAIR}`, `orderbook:{PAIR}`)

## Architecture Patterns

- Services pattern: business logic in `server/services/`, called from routes
- Sequelize models in `server/models/` with associations
- Middleware chain: auth → rateLimit → route handler
- Socket.io rooms per trading pair for efficient broadcasting

## Frontend Patterns

- `public/js/trade.js` — orchestrator that initializes chart, orderbook, orderform
- Each JS module exports init functions called from orchestrator
- Socket.io client in `public/js/socket.js` — single connection shared across modules
- HTTP client in `public/js/api.js` — JWT-aware fetch wrapper

## Type Hints / Documentation

- No TypeScript — plain JS with JSDoc comments where helpful
- README.md contains full API documentation
- AGENTS.md contains developer onboarding guide

## Security

- JWT in Authorization header (Bearer token)
- bcrypt for password hashing
- Rate limiting per IP
- Helmet for security headers
- Never commit `.env` — it's in `.gitignore`

## Database

- SQLite file at `data/nextrade.db`
- Sequelize ORM with migrations handled by `sync()` in development
- Demo user ID: `00000000-0000-0000-0000-000000000001` (fixed UUID)
