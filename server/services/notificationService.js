let io = null;

function setIO(socketIO) {
  io = socketIO;
}

function emitTickerUpdate(pair, data) {
  if (!io) return;
  io.to(`ticker:${pair}`).emit('ticker:update', data);
  io.emit('ticker:update', { ...data, pair });
}

function emitOrderBookUpdate(pair, data) {
  if (!io) return;
  io.to(`orderbook:${pair}`).emit('orderbook:update', { pair, ...data });
}

function emitRecentTrades(pair, trades) {
  if (!io) return;
  const lastTrade = trades[0];
  if (lastTrade) {
    io.to(`trades:${pair}`).emit('trades:new', { pair, ...lastTrade });
  }
}

function emitTrade(trade) {
  if (!io) return;
  io.emit('trades:new', trade);
}

function emitChartUpdate(pair, timeframe, candle) {
  if (!io) return;
  io.to(`chart:${pair}:${timeframe}`).emit('chart:update', { pair, timeframe, candle });
}

function emitOrderUpdate(userId, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit('order:update', data);
}

function emitBalanceUpdate(userId, balances) {
  if (!io) return;
  io.to(`user:${userId}`).emit('balance:update', { balances });
}

module.exports = {
  setIO,
  emitTickerUpdate,
  emitOrderBookUpdate,
  emitRecentTrades,
  emitTrade,
  emitChartUpdate,
  emitOrderUpdate,
  emitBalanceUpdate,
};
