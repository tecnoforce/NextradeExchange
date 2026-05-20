# AGENTS.md — Guía para Agentes de IA (NexTrade)

## Propósito

Guía para que un agente de IA entienda, ejecute y modifique **NexTrade**, un exchange de criptomonedas que replica la interfaz de Binance con temática oscura. **Single-user mode**: abre directamente en `trade.html` sin login.

---

## Stack tecnológico

| Capa           | Tecnología                                                       |
|----------------|------------------------------------------------------------------|
| Backend        | Node.js v20+, Express, Socket.io                                 |
| Base de datos  | SQLite + Sequelize ORM                                           |
| Frontend       | HTML5, CSS3, JS vanilla (sin bundler)                            |
| Gráfico velas  | [Lightweight Charts v5](https://github.com/tradingview/lightweight-charts) (CDN) |
| Exchange API   | [CCXT v4.5.38+](https://github.com/ccxt/ccxt)                    |
| Tiempo real    | Socket.io v4 (WebSockets)                                        |
| Tests          | Playwright                                                       |

---

## Comandos esenciales

```bash
npm install           # Instalar dependencias
npm run seed          # Poblar DB con datos demo (siempre antes del primer arranque)
npm run dev           # Servidor desarrollo con nodemon
npm run start         # Servidor producción
npm test              # Tests con Playwright
npm run test:ui       # Tests con UI Playwright
npm run test:report   # Reporte de tests
```

---

## Archivos importantes

### Servidor

| Archivo | Propósito |
|---------|-----------|
| `server/index.js` | Entry point: Express + HTTP + Socket.io |
| `server/config/database.js` | Conexión SQLite con Sequelize |
| `server/config/constants.js` | Pares fallback, 16 timeframes, comisiones, balances default, DEFAULT_USER_ID |
| `server/config/exchange.js` | Cliente CCXT con URLs de Binance Testnet sobreescritas (`demo-api.binance.com`) |
| `server/models/` | Modelos Sequelize: User, Order, Trade, Transaction (+ `index.js` con asociaciones) |
| `server/middleware/auth.js` | Auth single-user: auto-asigna usuario demo por DEFAULT_USER_ID |
| `server/middleware/rateLimit.js` | Rate limiter: 1000 req/15min por IP |
| `server/middleware/errorHandler.js` | Manejador global de errores Express + Sequelize |
| `server/services/priceService.js` | Singleton: polling cada 3s a Binance Testnet vía CCXT (tickers, orderbooks, trades, velas) |
| `server/services/orderService.js` | Ejecución de órdenes reales en Binance Testnet vía CCXT |
| `server/services/orderBookService.js` | Order book en memoria (Map), top 20 niveles por par |
| `server/services/pairService.js` | Gestión de pares activos: top N por quote desde Binance, refresca cada 10min |
| `server/services/notificationService.js` | Disparo de eventos Socket.io (ticker, orderbook, trades, user) |
| `server/socket/index.js` | Manejador Socket.io: rooms por par y chart, suscripción, datos iniciales |
| `server/routes/auth.js` | `GET /api/auth/me` — perfil usuario actual |
| `server/routes/market.js` | Datos de mercado vía query params (`?pair=`, `?limit=`, `?interval=`) |
| `server/routes/orders.js` | CRUD de órdenes + `cancel-all` |
| `server/routes/wallet.js` | Balances, depósitos y retiros (con fallback a Binance) |
| `server/routes/user.js` | Perfil de usuario (GET/PUT) |
| `scripts/seed.js` | Crea usuario demo con DEFAULT_BALANCES en 20 monedas |

### Frontend

| Archivo | Propósito |
|---------|-----------|
| `public/trade.html` | Página principal de trading (layout 4 columnas + panel inferior) |
| `public/wallet.html` | Billetera con saldos, depósitos, retiros y resumen |
| `public/orders.html` | Historial de órdenes con filtros por par y estado |
| `public/css/variables.css` | Variables CSS (tema oscuro Binance) |
| `public/css/global.css` | Estilos globales: reset, tipografía, botones, scroll |
| `public/css/trade.css` | Layout grid 4 columnas + header + panel inferior + pestañas de mercado |
| `public/css/wallet.css` | Estilos de billetera: resumen, tabla, modal |
| `public/css/components/chart.css` | Contenedor del chart, toolbar timeframes, indicadores, OHLC |
| `public/css/components/orderbook.css` | Order book con barras de profundidad y spread |
| `public/css/components/orderform.css` | Formulario de órdenes: tabs, inputs, sliders |
| `public/css/components/ticker.css` | Barra de ticker: precio, cambio, stats |
| `public/js/api.js` | Cliente HTTP genérico (fetch wrapper) con todos los endpoints |
| `public/js/socket.js` | Cliente Socket.io con reconexión y cola de suscripciones |
| `public/js/chart.js` | Lightweight Charts v5 + MA(7/25/99) + volumen |
| `public/js/orderbook.js` | Render 20 niveles bid/ask con profundidad y marcadores |
| `public/js/orderform.js` | Formulario Limit/Market/Stop-Limit con toasts y sliders |
| `public/js/trade.js` | Orquestador de trade.html: pares, sockets, panels, polling |
| `public/js/wallet.js` | Lógica de billetera: tabla, total USDT, modales |
| `public/js/orders.js` | Conexión socket para recarga en vivo de órdenes |

### Tests

| Archivo | Propósito |
|---------|-----------|
| `tests/nextrade.spec.js` | Tests E2E: orderbook, wallet, orders page |
| `tests/realtime.spec.js` | Tests en tiempo real: socket, panels, reconexión |
| `tests/test-market-tabs.spec.js` | Tests de pestañas de filtrado de mercado (Todos/USDT/BTC/ETH/BNB) |

---

## Convenciones y restricciones

### Generales

- Node.js v20+ requerido.
- No commitear secretos: `.env` en `.gitignore`.
- SQLite en `data/nextrade.db` — no requiere servidor externo.
- **Sin bundler** (webpack/vite). Dependencias frontend desde CDN.
- Sin Redis — order book y caché en memoria del proceso.

### Modos de datos (`DATA_SOURCE`)

- `DATA_SOURCE=real` — **Binance Testnet vía CCXT**. Las órdenes se ejecutan directamente en Binance Testnet. Requiere API keys en `.env`.
- `DATA_SOURCE=simulated` — random walk desde precios de referencia. Ideal offline.

### CCXT y Binance Testnet

- CCXT v4.5.38+ framework de integración. Ver: https://github.com/ccxt/ccxt
- Binance Spot Testnet URLs:
  - REST: `https://demo-api.binance.com`
  - WS: `https://demo-ws-api.binance.com`
- En `server/config/exchange.js` se sobreescriben con `walkUrls()` si `DATA_SOURCE=real`.
- **URLs configurables vía `.env`**:
  - `BINANCE_REST_URL` (default: `https://demo-api.binance.com`)
  - `BINANCE_WS_URL` (default: `https://demo-ws-api.binance.com`)
- Sin API keys, CCXT funciona en modo público con datos limitados.

### Pares de trading

100 pares activos obtenidos dinámicamente desde Binance por volumen:

| Quote | Cantidad |
|-------|----------|
| USDT  | 40       |
| BTC   | 30       |
| ETH   | 15       |
| BNB   | 15       |

**Total: 100 pares.** Definido en `PAIR_ALLOCATION` en `server/config/constants.js`.
Gestionado por `server/services/pairService.js` que refresca cada 10 minutos.
Si falla la obtención, usa `FALLBACK_PAIRS` (20 pares hardcodeados).

### Timeframes

16 disponibles: `1s, 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M`
Chart default: `1s, 1m, 5m, 15m, 1h, 4h, 1d, 1w`

### Indicadores del chart

- MA(7), MA(25), MA(99) — medias móviles sobre precio de cierre
- Volumen como histograma debajo de velas

---

## Single-user mode

- **No requiere login.** Abre directamente en `trade.html`.
- ID fijo: `00000000-0000-0000-0000-000000000001` (definido en constants.js)
- Socket.io asigna este ID automáticamente (sin JWT). Ver `server/socket/index.js:21`
- El middleware auth (`server/middleware/auth.js`) busca o crea este usuario automáticamente.
- Balances demo: 10000 USDT, 1 BTC, 5 ETH, etc. (definido en `DEFAULT_BALANCES`)

---

## Arquitectura y flujo de datos

```
[Browser] ←→ [Socket.io] ←→ [Server (Express + Socket)]
                ↕                    ↕
         [Tiempo real]         [REST API]
                ↕                    ↕
    [priceService] ←→ [CCXT] ←→ [Binance Testnet]
         ↕                    ↕
    [orderService] ──────────→ [Binance Testnet (órdenes)]
         ↕
    [Sequelize / SQLite]
```

En modo `real`, las órdenes se ejecutan directamente en Binance Testnet vía `orderService.js`.
En modo `simulated`, se usa `matchingEngine.js` local (FIFO en memoria).

### Canales de Socket.io

| Evento | Dirección | Propósito |
|--------|-----------|-----------|
| `subscribe:pair` | Client→Server | Suscribirse a un par (ticker, orderbook, trades) |
| `unsubscribe:pair` | Client→Server | Desuscribirse de un par |
| `subscribe:chart` | Client→Server | Suscribirse a velas de un par+timeframe |
| `unsubscribe:chart` | Client→Server | Desuscribirse de velas |
| `subscribe:all` | Client→Server | Suscribirse a todos los pares activos |
| `ticker:update` | Server→Client | Precio actual de un par |
| `orderbook:update` | Server→Client | Top 20 bids/asks con profundidad |
| `trades:recent` | Server→Client | Trades recientes al suscribirse |
| `trades:new` | Server→Client | Nuevo trade ejecutado |
| `chart:update` | Server→Client | Vela actualizada (tiempo real) |
| `order:update` | Server→Client | Notificación de cambio de orden |
| `balance:update` | Server→Client | Notificación de cambio de saldo |

### Eventos del servidor (escucha en `connection`)

- `connection` — asigna userId, prepara socket
- Cada socket se une automáticamente a `user:{userId}` en conexión
- `subscribe:pair` — une a rooms `ticker:`, `orderbook:`, `trades:` y envía datos iniciales
- `subscribe:chart` — une a room `chart:{pair}:{timeframe}` y envía vela actual

---

## Ejecución de órdenes

- **Modo real** (`DATA_SOURCE=real`): Las órdenes se ejecutan directamente en Binance Testnet vía `server/services/orderService.js` usando CCXT `exchange.createOrder()`. Soporta: Limit, Market, Stop-Limit.
- **Modo simulado**: Usa `server/services/matchingEngine.js` local con FIFO contra el order book en memoria.
- Fee maker/taker: 0.1% c/u (configurable en constants.js)
- Mínimo de orden: 5 USDT
- Máximo 50 órdenes abiertas por usuario

---

## API REST endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/auth/me` | Perfil del usuario actual |
| GET | `/api/market/ticker?pair=` | Ticker de un par |
| GET | `/api/market/ticker/all` | Ticker de todos los pares activos |
| GET | `/api/market/orderbook?pair=&limit=` | Order book de un par |
| GET | `/api/market/trades?pair=&limit=` | Trades recientes |
| GET | `/api/market/klines?pair=&interval=&limit=` | Datos OHLCV históricos |
| GET | `/api/market/pairs` | Lista de pares activos y todos disponibles |
| GET | `/api/market/timeframes` | Timeframes disponibles |
| GET | `/api/orders/open?pair=` | Órdenes abiertas (opcional filtrar por par) |
| GET | `/api/orders/history` | Historial de órdenes (paginado) |
| POST | `/api/orders` | Crear orden |
| DELETE | `/api/orders/:id` | Cancelar orden |
| DELETE | `/api/orders/cancel-all` | Cancelar todas las órdenes |
| GET | `/api/wallet/balances` | Saldos del usuario (con fallback a Binance) |
| POST | `/api/wallet/deposit` | Simular depósito |
| POST | `/api/wallet/withdraw` | Simular retiro |
| GET | `/api/wallet/transactions` | Historial de transacciones |
| GET | `/api/user/profile` | Perfil del usuario |
| PUT | `/api/user/profile` | Actualizar perfil |

---

## Uso de Context7 MCP

Para información actualizada de librerías, frameworks, SDKs o APIs:

1. `context7_resolve-library-id` con el nombre de la librería
2. `context7_query-docs` con el ID obtenido y la consulta

### Cuándo usar

- **CCXT**: métodos específicos, opciones de exchange, cambios API
- **Lightweight Charts**: opciones de series, indicadores, eventos
- **Sequelize**: modelos, hooks, eager loading, validaciones
- **Socket.io**: transporte, rooms, middlewares
- **Express**: middlewares, routing, error handling
- **Playwright**: selectores, assertions, config

### Cuándo NO usar

- Refactorizar lógica de negocio del proyecto
- Escribir funcionalidad nueva desde cero
- Debugging de lógica propia

---

## Pautas de comportamiento para el agente

1. **Siempre** ejecuta `npm run seed` antes de arrancar el servidor por primera vez.
2. **No** realices acciones que requieran API keys de Binance a menos que el usuario las proporcione.
3. Cuando modifiques código del servidor, reinicia el servidor para que los cambios surtan efecto.
4. Enlaza a archivos específicos con número de línea (`archivo:linea`).
5. Para info actualizada de librerías, usa **Context7 MCP**.
6. Antes de crear un archivo nuevo, verifica si puedes modificar uno existente.
7. Sigue el estilo del código: `async/await`, `module.exports`, camelCase.
8. Ejecuta `npm test` después de cambios importantes para verificar que no se rompe nada.
9. **No hay página de login** — la app es single-user. No crees ni modifiques `public/index.html`.
10. Los endpoints de market usan **query params** (`?pair=BTC/USDT`), no path params.

---

## Notas importantes

- No existe `public/index.html`. La app redirige todo a `trade.html`.
- JWT y bcrypt están en `package.json` como dependencias pero **no se usan activamente** en single-user mode.
- Si se añade multi-user en el futuro, habrá que re-activar JWT y el login/registro.
- Los tests de Playwright asumen que el servidor ya está corriendo en `http://localhost:3000`. El `webServer` config en `playwright.config.js` arranca el servidor automáticamente.
- `getAllTickers()` en `priceService.js` solo retorna tickers de los pares activos (100), no de todos los cacheados.
- El `PairService` refresca cada 10 minutos (`PAIRS_REFRESH_INTERVAL`). Los pares activos pueden cambiar si hay fluctuaciones de volumen en Binance.
- La búsqueda en la columna de mercados filtra por nombre del par dentro de la pestaña activa.
