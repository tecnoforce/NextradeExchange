const { ORDERBOOK_DEPTH } = require('../config/constants');

const orderBooks = new Map();

function updateOrderBook(pair, data) {
  orderBooks.set(pair, {
    bids: (data.bids || []).slice(0, ORDERBOOK_DEPTH).map(([price, amount]) => [
      parseFloat(price),
      parseFloat(amount),
    ]),
    asks: (data.asks || []).slice(0, ORDERBOOK_DEPTH).map(([price, amount]) => [
      parseFloat(price),
      parseFloat(amount),
    ]),
    timestamp: data.timestamp || Date.now(),
  });
}

function getOrderBook(pair) {
  return orderBooks.get(pair) || { bids: [], asks: [], timestamp: Date.now() };
}

function getAllOrderBooks() {
  const result = {};
  orderBooks.forEach((ob, pair) => {
    result[pair] = ob;
  });
  return result;
}

function getMidPrice(pair) {
  const ob = orderBooks.get(pair);
  if (!ob || !ob.bids.length || !ob.asks.length) return null;
  const bestBid = ob.bids[0][0];
  const bestAsk = ob.asks[0][0];
  return (bestBid + bestAsk) / 2;
}

module.exports = {
  updateOrderBook,
  getOrderBook,
  getAllOrderBooks,
  getMidPrice,
};
