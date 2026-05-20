const { Server } = require('socket.io');
const notificationService = require('../services/notificationService');
const orderBookService = require('../services/orderBookService');
const priceService = require('../services/priceService');
const pairService = require('../services/pairService');
const { DEFAULT_USER_ID } = require('../config/constants');

function setupSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  notificationService.setIO(io);

  io.use((socket, next) => {
    socket.userId = DEFAULT_USER_ID;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.join(`user:${socket.userId}`);

    socket.on('subscribe:pair', ({ pair }) => {
      if (!pair) return;
      const normalizedPair = pair.includes('/') ? pair : pair.replace('USDT', '/USDT');
      socket.join(`ticker:${normalizedPair}`);
      socket.join(`orderbook:${normalizedPair}`);
      socket.join(`trades:${normalizedPair}`);

      const ticker = priceService.getTicker(normalizedPair);
      if (ticker) socket.emit('ticker:update', ticker);

      const orderbook = orderBookService.getOrderBook(normalizedPair);
      if (orderbook.bids.length || orderbook.asks.length) {
        socket.emit('orderbook:update', { pair: normalizedPair, ...orderbook });
      }

      const trades = priceService.getRecentTrades(normalizedPair);
      if (trades.length) {
        socket.emit('trades:recent', { pair: normalizedPair, trades });
      }
    });

    socket.on('subscribe:chart', ({ pair, timeframe }) => {
      if (!pair || !timeframe) return;
      const normalizedPair = pair.includes('/') ? pair : pair.replace('USDT', '/USDT');
      const room = `chart:${normalizedPair}:${timeframe}`;
      socket.join(room);

      const key = `${normalizedPair}:${timeframe}`;
      const candle = priceService.currentCandles.get(key);
      if (candle) {
        socket.emit('chart:update', { pair: normalizedPair, timeframe, candle: { ...candle, isFinal: false } });
      }
    });

    socket.on('unsubscribe:chart', ({ pair, timeframe }) => {
      if (!pair || !timeframe) return;
      const normalizedPair = pair.includes('/') ? pair : pair.replace('USDT', '/USDT');
      socket.leave(`chart:${normalizedPair}:${timeframe}`);
    });

    socket.on('unsubscribe:pair', ({ pair }) => {
      if (!pair) return;
      const normalizedPair = pair.includes('/') ? pair : pair.replace('USDT', '/USDT');
      socket.leave(`ticker:${normalizedPair}`);
      socket.leave(`orderbook:${normalizedPair}`);
      socket.leave(`trades:${normalizedPair}`);
    });

    socket.on('subscribe:all', () => {
      const pairs = pairService.getActivePairs();
      pairs.forEach(pair => {
        socket.join(`ticker:${pair}`);
        socket.join(`orderbook:${pair}`);
        socket.join(`trades:${pair}`);
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = { setupSocketIO };