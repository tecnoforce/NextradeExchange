# 🚀 PROMPT PROFESIONAL — Exchange de Criptomonedas (Estilo Binance)

> **Propósito:** Prompt detallado para que una IA (Claude, GPT-4, Gemini, etc.) genere un proyecto completo de exchange de criptomonedas web, inspirado en Binance, usando Node.js como backend principal.

---

## 📌 CONTEXTO DEL PROYECTO

Crea un **exchange de criptomonedas web completo** llamado **"NexTrade"** (puedes renombrarlo). La plataforma debe replicar la experiencia visual y funcional de Binance, adaptada para desarrollo local/demo. El diseño debe ser profesional, oscuro (dark mode), con datos de mercado en tiempo real simulados o conectados a APIs públicas gratuitas.

---

## 🧱 STACK TECNOLÓGICO

### Backend
- **Runtime:** Node.js v20+
- **Framework:** Express.js
- **WebSockets:** Socket.io (para actualizaciones en tiempo real de precios y orderbook)
- **Base de datos:** PostgreSQL con Sequelize ORM (usuarios, órdenes, historial)
- **Cache/sesiones:** Redis (sesiones de usuario, caché de precios)
- **Autenticación:** JWT (JSON Web Tokens) + bcrypt para hashing de contraseñas
- **API de mercado:** CoinGecko API (gratuita, sin key) o Binance Public API para datos reales
- **Variables de entorno:** dotenv

### Frontend
- **HTML5 + CSS3 + JavaScript vanilla** (sin framework frontend, para máxima compatibilidad)
- **Gráficas de velas:** TradingView Lightweight Charts (librería gratuita de TradingView)
- **Estilos:** CSS custom con variables (dark theme), sin Bootstrap — diseño propio inspirado en Binance
- **WebSocket cliente:** Socket.io-client
- **Iconos:** Lucide Icons o Feather Icons (CDN)
- **Fuentes:** JetBrains Mono para datos numéricos, Inter para UI general

### DevOps / Herramientas
- **Gestor de paquetes:** npm
- **Proceso manager:** PM2 (para producción)
- **Proxy inverso:** Nginx (configuración incluida)
- **Variables de entorno:** .env con .env.example documentado
- **Linter:** ESLint con config estándar

---

## 📁 ESTRUCTURA DEL PROYECTO

```
nextrade/
├── server/
│   ├── index.js                  # Entry point principal
│   ├── config/
│   │   ├── database.js           # Conexión PostgreSQL con Sequelize
│   │   ├── redis.js              # Configuración Redis
│   │   └── constants.js          # Pares de trading, decimales, límites
│   ├── models/
│   │   ├── User.js               # id, email, password_hash, balance (JSONB por moneda)
│   │   ├── Order.js              # id, userId, pair, side, type, price, amount, status
│   │   ├── Trade.js              # id, orderId, buyOrderId, sellOrderId, price, amount
│   │   └── Transaction.js        # id, userId, type (deposit/withdraw), amount, currency
│   ├── routes/
│   │   ├── auth.js               # POST /api/auth/register, /login, /logout, /me
│   │   ├── market.js             # GET /api/market/ticker, /orderbook, /trades, /klines
│   │   ├── orders.js             # GET/POST/DELETE /api/orders (auth required)
│   │   ├── wallet.js             # GET /api/wallet/balances, POST /deposit, /withdraw
│   │   └── user.js               # GET/PUT /api/user/profile
│   ├── middleware/
│   │   ├── auth.js               # Verificación JWT
│   │   ├── rateLimit.js          # express-rate-limit configurado
│   │   └── errorHandler.js       # Manejo global de errores
│   ├── services/
│   │   ├── matchingEngine.js     # Motor de órdenes (limit/market orders)
│   │   ├── priceService.js       # Polling a CoinGecko / Binance API pública
│   │   ├── orderBookService.js   # Mantiene orderbook en memoria (Redis)
│   │   └── notificationService.js # Emite eventos por WebSocket
│   └── socket/
│       └── index.js              # Manejo de eventos Socket.io
├── public/
│   ├── index.html                # Landing/login page
│   ├── trade.html                # Página principal de trading
│   ├── wallet.html               # Página de billetera
│   ├── orders.html               # Historial de órdenes
│   ├── css/
│   │   ├── variables.css         # Tokens de diseño (colores, tipografía, spacing)
│   │   ├── global.css            # Reset, base, componentes globales
│   │   ├── trade.css             # Layout trading (grid de 4 columnas)
│   │   ├── wallet.css            # Estilos billetera
│   │   └── components/
│   │       ├── orderbook.css
│   │       ├── chart.css
│   │       ├── orderform.css
│   │       └── ticker.css
│   └── js/
│       ├── api.js                # Wrapper fetch con JWT headers
│       ├── socket.js             # Cliente Socket.io
│       ├── trade.js              # Lógica página de trading
│       ├── chart.js              # Integración TradingView Lightweight Charts
│       ├── orderbook.js          # Renderizado orderbook en tiempo real
│       ├── orderform.js          # Formulario compra/venta
│       └── wallet.js             # Lógica billetera
├── nginx/
│   └── nextrade.conf             # Configuración Nginx (proxy pass + SSL)
├── scripts/
│   ├── seed.js                   # Seed de usuarios demo y datos iniciales
│   └── migrate.js                # Migraciones de base de datos
├── .env.example                  # Variables de entorno documentadas
├── .eslintrc.js
├── .gitignore
├── package.json
└── README.md                     # Guía de instalación y uso
```

---

## 🎨 DISEÑO UI — ESPECIFICACIONES VISUALES

### Paleta de colores (CSS variables)

```css
:root {
  /* Fondo */
  --bg-primary:    #0b0e11;  /* Fondo principal */
  --bg-secondary:  #161a1e;  /* Paneles laterales */
  --bg-tertiary:   #1e2329;  /* Cards, modales */
  --bg-hover:      #2b3139;  /* Hover states */

  /* Texto */
  --text-primary:  #eaecef;  /* Texto principal */
  --text-secondary:#848e9c;  /* Labels, subtextos */
  --text-muted:    #474d57;  /* Placeholders */

  /* Acento */
  --accent-buy:    #0ecb81;  /* Verde compra */
  --accent-sell:   #f6465d;  /* Rojo venta */
  --accent-yellow: #f0b90b;  /* Amarillo Binance */

  /* Bordes */
  --border:        #2b3139;
  --border-light:  #363c44;

  /* Tipografía */
  --font-mono:     'JetBrains Mono', monospace;
  --font-ui:       'Inter', sans-serif;
}
```

### Layout de la página de trading (trade.html)

El layout debe ser un **grid de 4 columnas** idéntico a Binance:

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER: Logo | Par selector | Ticker stats | Nav | User     │
├──────────┬────────────────────────────┬────────┬─────────────┤
│ ORDER    │  CHART (TradingView)        │ ORDER  │ MARKET      │
│ BOOK     │                            │ FORM   │ PAIRS LIST  │
│ (bids/   │  ─────────────────────     │ (Buy/  │ (BTC/USDT   │
│  asks)   │  RECENT TRADES             │  Sell) │  ETH/USDT…) │
├──────────┴────────────────────────────┴────────┴─────────────┤
│  OPEN ORDERS | ORDER HISTORY | TRADE HISTORY | BALANCES      │
└──────────────────────────────────────────────────────────────┘
```

---

## ⚙️ FUNCIONALIDADES REQUERIDAS

### 1. Autenticación
- Registro con email + contraseña (validación de complejidad)
- Login con JWT (access token 15min + refresh token 7 días en httpOnly cookie)
- Logout (invalidación de token en Redis blacklist)
- Middleware de protección de rutas

### 2. Ticker y datos de mercado (tiempo real)
- Polling cada 3 segundos a CoinGecko API para: BTC/USDT, ETH/USDT, BNB/USDT, SOL/USDT, XRP/USDT, ADA/USDT, DOGE/USDT, AVAX/USDT
- Datos por par: precio actual, cambio 24h (%), alto 24h, bajo 24h, volumen 24h
- Broadcast via Socket.io a todos los clientes conectados
- Header ticker con animación de color (verde si sube, rojo si baja)

### 3. Gráfica de velas (Candlestick Chart)
- Usar **TradingView Lightweight Charts v4** (CDN)
- Datos históricos desde CoinGecko `/coins/{id}/ohlc` (gratis, sin key)
- Timeframes: 1m, 5m, 15m, 1h, 4h, 1D, 1W
- Indicadores: MA(7), MA(25), MA(99) visibles en el chart
- Volumen en el sub-panel inferior
- Modo: Original / Trading View / Profundidad (depth chart)
- Línea de precio actual parpadeando

### 4. Order Book
- Mostrar 20 niveles de bid (verde) y 20 de ask (rojo)
- Barra de profundidad visual detrás de cada fila (width % proporcional al volumen)
- Precio del último trade en el centro con flecha de dirección
- Actualización cada 1 segundo via Socket.io
- Datos simulados realistas basados en precio actual ± spread

### 5. Formulario de órdenes (Order Form)
- Tabs: Límite | Mercado | Stop-Limit
- Campos: Precio (solo en límite), Cantidad en BTC, Total en USDT
- Sliders: 25% / 50% / 75% / 100% del balance disponible
- Botones: **Comprar BTC** (verde) | **Vender BTC** (rojo)
- Validaciones: balance suficiente, precio > 0, cantidad mínima (5 USDT)
- Balance disponible visible y actualizado

### 6. Motor de matching de órdenes
- Implementar en `matchingEngine.js` con estas reglas:
  - **Orden de mercado:** ejecuta inmediatamente al mejor precio disponible
  - **Orden límite:** entra al orderbook, se ejecuta cuando hay match
  - Price-time priority (FIFO)
  - Al ejecutar: actualizar balances en DB, crear registro en `Trade`, emitir evento Socket.io
  - Estado de orden: `pending` → `partial` → `filled` | `cancelled`

### 7. Billetera (wallet.html)
- Vista de balances por moneda (coin, cantidad total, disponible, en órdenes)
- Tabla con: Coin | Total | Disponible | En órdenes | Valor BTC | Valor USDT
- Botones de Depositar / Retirar (modal simulado, sin blockchain real)
- Depositar: suma balance directamente (demo mode)
- Historial de transacciones

### 8. Órdenes abiertas e historial
- Tabla en la parte inferior del trading: Fecha | Par | Tipo | Lado | Precio | Cantidad | Completado | Estado | Acción
- Cancelar orden individual o todas
- Historial con paginación (20 por página)

### 9. Lista de pares de mercado
- Panel derecho con lista scrolleable de pares USDT
- Búsqueda en tiempo real por nombre del par
- Columnas: Par | Último precio | Cambio 24h%
- Color rojo/verde según cambio
- Click en par carga ese mercado en el chart y orderform
- Marcadores de favoritos (guardados en localStorage)

---

## 🔌 ENDPOINTS DE LA API REST

```
AUTH
POST   /api/auth/register          Body: { email, password, username }
POST   /api/auth/login             Body: { email, password }
POST   /api/auth/logout
GET    /api/auth/me                Auth required

MARKET (público)
GET    /api/market/ticker          Query: ?pair=BTCUSDT
GET    /api/market/ticker/all      Todos los pares
GET    /api/market/orderbook       Query: ?pair=BTCUSDT&limit=20
GET    /api/market/trades          Query: ?pair=BTCUSDT&limit=50
GET    /api/market/klines          Query: ?pair=BTCUSDT&interval=1h&limit=200

ORDERS (auth required)
GET    /api/orders/open            Query: ?pair=BTCUSDT (opcional)
GET    /api/orders/history         Query: ?pair=BTCUSDT&page=1&limit=20
POST   /api/orders                 Body: { pair, side, type, price?, amount }
DELETE /api/orders/:id
DELETE /api/orders/cancel-all      Query: ?pair=BTCUSDT (opcional)

WALLET (auth required)
GET    /api/wallet/balances
POST   /api/wallet/deposit         Body: { currency, amount }
POST   /api/wallet/withdraw        Body: { currency, amount, address }
GET    /api/wallet/transactions    Query: ?page=1&limit=20
```

---

## 📡 EVENTOS WEBSOCKET (Socket.io)

```javascript
// Servidor → Cliente
'ticker:update'      // { pair, price, change24h, high24h, low24h, volume24h }
'orderbook:update'   // { pair, bids: [[price, qty]], asks: [[price, qty]] }
'trades:new'         // { pair, price, qty, side, timestamp }
'order:update'       // { orderId, status, filled } — solo al usuario dueño
'balance:update'     // { currency, available, inOrders } — solo al usuario

// Cliente → Servidor
'subscribe:pair'     // { pair: 'BTCUSDT' } — subscribirse a un par
'unsubscribe:pair'   // { pair: 'BTCUSDT' }
```

---

## 🛡️ SEGURIDAD

- Helmet.js para headers HTTP seguros
- CORS configurado con whitelist de dominios
- Rate limiting: 100 req/15min global, 10 req/min en auth endpoints
- Validación de inputs con express-validator en todos los endpoints
- Sanitización contra SQL Injection (Sequelize parameterized queries)
- JWT en memoria (no localStorage), refresh token en httpOnly cookie
- Contraseñas hasheadas con bcrypt (cost factor 12)
- Variables sensibles SOLO en .env (nunca en código)

---

## 📦 PACKAGE.JSON — DEPENDENCIAS

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "sequelize": "^6.35.2",
    "pg": "^8.11.3",
    "pg-hstore": "^2.3.4",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "axios": "^1.6.2",
    "uuid": "^9.0.1",
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "eslint": "^8.56.0"
  },
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js",
    "seed": "node scripts/seed.js",
    "migrate": "node scripts/migrate.js"
  }
}
```

---

## 🌱 DATOS DE SEED (demo)

Al ejecutar `npm run seed`, crear:
- 2 usuarios demo: `demo@nextrade.com` / `Demo1234!` con balances iniciales (1 BTC, 5 ETH, 10,000 USDT, etc.)
- 50 órdenes históricas simuladas en los últimos 7 días
- OrderBook inicial con 20 niveles bid/ask para cada par

---

## ⚙️ VARIABLES DE ENTORNO (.env.example)

```env
# Server
PORT=3000
NODE_ENV=development

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nextrade_db
DB_USER=postgres
DB_PASS=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASS=

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# APIs externas
COINGECKO_API_URL=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=          # Opcional, sin key funciona (rate limit más bajo)

# Configuración de trading
MIN_ORDER_USDT=5
MAX_ORDERS_PER_USER=50
MAKER_FEE=0.001             # 0.1%
TAKER_FEE=0.001             # 0.1%
```

---

## 📝 README.md — CONTENIDO REQUERIDO

El README debe incluir:
1. Descripción del proyecto y screenshots
2. Requisitos previos (Node.js, PostgreSQL, Redis)
3. Instalación paso a paso (clonar, instalar, configurar .env, migrar, seed, start)
4. Credenciales demo para probar
5. Guía de arquitectura (breve)
6. Endpoints documentados
7. Cómo conectar a datos reales vs simulados
8. Licencia MIT

---

## 🎯 INSTRUCCIONES PARA LA IA

1. **Genera el proyecto COMPLETO** — todos los archivos listados en la estructura, sin omitir ninguno.
2. **El frontend debe verse exactamente como Binance** — dark theme, grid de 4 columnas, colores definidos en este prompt.
3. **El backend debe funcionar en modo demo** sin necesidad de blockchain real — los depósitos/retiros son simulados.
4. **Los datos de mercado deben ser reales** — conectar a CoinGecko API pública (no requiere API key) para precios actuales.
5. **El orderbook y el matching engine deben ser funcionales** — no simulados, sino que realmente ejecuten órdenes y actualicen balances.
6. **Incluye comentarios en el código** en cada función/módulo explicando qué hace.
7. **Prioriza seguridad** — aplica todas las medidas listadas en la sección de seguridad.
8. **TradingView Lightweight Charts** debe cargar datos OHLCV reales y permitir cambio de timeframe.
9. **Socket.io** debe emitir actualizaciones cada segundo para orderbook y cada 3 segundos para ticker.
10. **Entrega primero** la estructura de archivos, luego cada archivo en orden: `package.json` → `server/index.js` → modelos → rutas → servicios → frontend.

---

## ✅ CRITERIOS DE ÉXITO

El proyecto es exitoso si:
- [ ] `npm install && npm run migrate && npm run seed && npm run dev` inicia sin errores
- [ ] Se puede registrar e iniciar sesión
- [ ] El chart muestra velas reales de BTC/USDT
- [ ] El orderbook se actualiza en tiempo real
- [ ] Se puede colocar una orden límite y aparece en "Órdenes abiertas"
- [ ] Si dos órdenes hacen match, ambas se ejecutan y los balances se actualizan
- [ ] La billetera muestra balances correctos
- [ ] El diseño es visualmente idéntico al screenshot de Binance proporcionado
- [ ] No hay errores en consola del navegador ni del servidor

---

*Generado con Claude Sonnet 4.6 | Proyecto: NexTrade Exchange | Stack: Node.js + Express + Socket.io + PostgreSQL + Redis + TradingView Charts*
