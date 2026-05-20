# NexTrade - Exchange de Criptomonedas

Exchange de criptomonedas web inspirado en Binance, con datos en tiempo real de Binance Testnet y motor de matching local.

## Características

- **Datos de mercado en tiempo real** desde Binance Testnet vía CCXT (WebSockets)
- **Gráfico de velas** con TradingView Lightweight Charts v5 + indicadores MA(7), MA(25), MA(99)
- **Order Book** con 20 niveles y barras de profundidad visual
- **Motor de matching** local con prioridad precio-tiempo (FIFO)
- **Órdenes**: Límite, Mercado y Stop-Limit
- **Billetera** con depósitos/retiros simulados
- **20 pares de trading** USDT
- **Modo configurable**: Real (Binance Testnet) o Simulado
- **Dark theme** réplica exacta de Binance
- **16 timeframes** de velas (1s a 1M)

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express.js |
| Tiempo real | Socket.io v4 |
| Datos de mercado | CCXT (Binance Testnet) |
| Base de datos | SQLite + Sequelize ORM |
| Frontend | HTML5 + CSS3 + JavaScript vanilla |
| Gráficos | TradingView Lightweight Charts v5 |
| Autenticación | JWT (JSON Web Tokens) + bcrypt |

## Requisitos

- Node.js v20+
- npm

## Instalación

```bash
# 1. Clonar o navegar al directorio
cd FrontEnd-Binance-V1

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env

# 4. Editar .env con tus API keys de Binance Testnet
# Obtén keys en: https://testnet.binance.vision/
```

### Configurar .env

```env
PORT=3000
NODE_ENV=development
DB_PATH=./data/nextrade.db

JWT_SECRET=tu_clave_secreta_aqui_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Binance Testnet API Keys
BINANCE_TESTNET_API_KEY=Yws67cYTj9MKyasVwsqBDZktJQ3tjxojkae2dvgobJSQDgDggmTv2mHrGCLP5jbt
BINANCE_TESTNET_SECRET=9eQuZl6FuMNLBANTiywgJm5PlLJeMgPSP7tk1fyTwqTjuPDRahJJdIYHkvpO6MJK

# Modo de datos: real (Binance Testnet) o simulated
DATA_SOURCE=real

MIN_ORDER_USDT=5
MAKER_FEE=0.001
TAKER_FEE=0.001
```

### Obtener API Keys de Binance Testnet

1. Ve a https://testnet.binance.vision/
2. Inicia sesión con GitHub
3. Haz clic en **Generate HMAC_SHA256 Key**
4. Copia el API Key y Secret Key
5. Pégalos en tu archivo `.env`

## Iniciar

```bash
# Crear base de datos y usuario demo
npm run seed

# Iniciar servidor
npm run dev
```

El servidor estará disponible en: **http://localhost:3000**

## Credenciales Demo

| Email | Contraseña |
|-------|-----------|
| demo@nextrade.com | Demo1234! |
| test@nextrade.com | Demo1234! |

Ambos usuarios tienen balances iniciales en todas las monedas soportadas.

## Estructura del Proyecto

```
├── server/
│   ├── index.js              # Entry point
│   ├── config/               # Database, Exchange, Constants
│   ├── models/               # Sequelize models (User, Order, Trade, Transaction)
│   ├── middleware/           # Auth, Rate Limit, Error Handler
│   ├── services/             # PriceService, MatchingEngine, OrderBook, Notifications
│   ├── routes/               # API REST endpoints
│   └── socket/               # Socket.io handlers
├── public/
│   ├── index.html            # Login/Register
│   ├── trade.html            # Página de trading
│   ├── wallet.html           # Billetera
│   ├── orders.html           # Historial de órdenes
│   ├── css/                  # Estilos (variables, global, trade, components)
│   └── js/                   # Frontend logic (api, socket, chart, orderbook, etc.)
├── scripts/
│   └── seed.js               # Seed de base de datos
├── data/                     # SQLite database
├── .env.example
├── package.json
└── README.md
```

## API REST

### Autenticación
```
POST   /api/auth/register     Body: { email, password }
POST   /api/auth/login        Body: { email, password }
GET    /api/auth/me           Headers: Authorization: Bearer <token>
```

### Mercado (Público)
```
GET    /api/market/ticker     Query: ?pair=BTC/USDT
GET    /api/market/ticker/all
GET    /api/market/orderbook  Query: ?pair=BTC/USDT&limit=20
GET    /api/market/trades     Query: ?pair=BTC/USDT&limit=50
GET    /api/market/klines     Query: ?pair=BTC/USDT&interval=1h&limit=200
GET    /api/market/timeframes
```

### Órdenes (Auth required)
```
GET    /api/orders/open       Query: ?pair=BTC/USDT
GET    /api/orders/history    Query: ?pair=BTC/USDT&page=1&limit=20
POST   /api/orders            Body: { pair, side, type, price?, amount }
DELETE /api/orders/:id
DELETE /api/orders/cancel-all Query: ?pair=BTC/USDT
```

### Billetera (Auth required)
```
GET    /api/wallet/balances
POST   /api/wallet/deposit    Body: { currency, amount }
POST   /api/wallet/withdraw   Body: { currency, amount, address }
GET    /api/wallet/transactions
```

### Usuario (Auth required)
```
GET    /api/user/profile
PUT    /api/user/profile      Body: { email? }
```

## WebSocket Events

### Cliente → Servidor
```javascript
socket.emit('subscribe:pair', { pair: 'BTC/USDT' });
socket.emit('unsubscribe:pair', { pair: 'BTC/USDT' });
socket.emit('subscribe:all');
```

### Servidor → Cliente
```javascript
socket.on('ticker:update', (data) => { ... });
socket.on('orderbook:update', (data) => { ... });
socket.on('trades:new', (data) => { ... });
socket.on('order:update', (data) => { ... });
socket.on('balance:update', (data) => { ... });
```

## Pares de Trading

BTC/USDT, ETH/USDT, BNB/USDT, SOL/USDT, XRP/USDT, ADA/USDT, DOGE/USDT, AVAX/USDT, DOT/USDT, MATIC/USDT, LINK/USDT, UNI/USDT, ATOM/USDT, LTC/USDT, NEAR/USDT, APT/USDT, ARB/USDT, OP/USDT, FIL/USDT, INJ/USDT

## Timeframes

1s, 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M

## Modo Simulado

Si no tienes API keys o quieres probar sin conexión externa, cambia en `.env`:

```env
DATA_SOURCE=simulated
```

En modo simulado, los precios se generan con un random walk realista basado en precios de referencia.

## Notas Importantes

- **Binance Testnet** se resetea aproximadamente una vez al mes
- Las API keys del Testnet son independientes de las de producción
- El matching engine es local — las órdenes se matchean entre usuarios de la plataforma
- Los depósitos/retiros son simulados (no interactúan con blockchain real)
- SQLite se usa para desarrollo local. Para producción, migrar a PostgreSQL

## Licencia

MIT
