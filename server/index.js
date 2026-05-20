require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const { testConnection } = require('./config/database');
const { syncDatabase } = require('./models');
const { setupSocketIO } = require('./socket');
const { globalLimiter } = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');
const pairService = require('./services/pairService');
const priceService = require('./services/priceService');

const authRoutes = require('./routes/auth');
const marketRoutes = require('./routes/market');
const ordersRoutes = require('./routes/orders');
const walletRoutes = require('./routes/wallet');
const userRoutes = require('./routes/user');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', globalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/user', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'trade.html'));
});

app.use(errorHandler);

const io = setupSocketIO(server);

async function startServer() {
  try {
    console.log('[Server] Starting NexTrade Exchange...');
    console.log(`[Server] Data source: ${process.env.DATA_SOURCE || 'simulated'}`);

    await testConnection();
    await syncDatabase();

    const exchange = await pairService.init();
    await priceService.init(exchange);

    server.listen(PORT, () => {
      console.log(`[Server] NexTrade running on http://localhost:${PORT}`);
      console.log(`[Server] API: http://localhost:${PORT}/api`);
      console.log(`[Server] WebSocket: ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received. Shutting down...');
  priceService.stop();
  server.close(() => {
    console.log('[Server] Server closed.');
    process.exit(0);
  });
});

startServer();
