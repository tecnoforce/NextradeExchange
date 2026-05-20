# Suggested Commands

## Project Commands

```bash
npm install           # Install dependencies
npm run seed          # Seed DB with demo users and balances
npm run dev           # Dev server with nodemon (auto-reload)
npm run start         # Production server
```

## Windows-Specific Notes

- PowerShell uses `;` instead of `&&` for command chaining: `npm install; if ($?) { npm run seed }`
- Use `Get-ChildItem` instead of `ls`, `Select-String` instead of `grep` (or install Unix tools)
- Path separator is `\` not `/` in native commands, but Node.js handles both
- Run PowerShell as Administrator if port 3000 is blocked by another process

## Environment Setup

```powershell
# Copy env template
cp .env.example .env

# Edit .env with API keys (optional for simulated mode)
# Set DATA_SOURCE=simulated for offline dev

# Seed and start
npm run seed
npm run dev
```

## Verification

- Server runs on http://localhost:3000
- Trade page: http://localhost:3000/trade.html
- Wallet: http://localhost:3000/wallet.html
- Orders: http://localhost:3000/orders.html
