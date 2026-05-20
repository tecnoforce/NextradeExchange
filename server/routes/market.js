const express = require('express');
const priceService = require('../services/priceService');
const orderBookService = require('../services/orderBookService');
const pairService = require('../services/pairService');
const { TIMEFRAMES, CHART_TIMEFRAMES } = require('../config/constants');

const router = express.Router();

router.get('/ticker', (req, res) => {
  const { pair } = req.query;
  if (!pair) {
    return res.status(400).json({ error: 'Pair parameter required' });
  }
  const ticker = priceService.getTicker(pair);
  if (!ticker) {
    return res.status(404).json({ error: 'Pair not found' });
  }
  res.json(ticker);
});

router.get('/ticker/all', (req, res) => {
  res.json(priceService.getAllTickers());
});

router.get('/orderbook', (req, res) => {
  const { pair, limit } = req.query;
  if (!pair) {
    return res.status(400).json({ error: 'Pair parameter required' });
  }
  const orderbook = orderBookService.getOrderBook(pair);
  const depth = parseInt(limit) || 20;
  res.json({
    pair,
    bids: orderbook.bids.slice(0, depth),
    asks: orderbook.asks.slice(0, depth),
    timestamp: orderbook.timestamp,
  });
});

router.get('/trades', (req, res) => {
  const { pair, limit } = req.query;
  if (!pair) {
    return res.status(400).json({ error: 'Pair parameter required' });
  }
  const trades = priceService.getRecentTrades(pair);
  const depth = parseInt(limit) || 50;
  res.json(trades.slice(0, depth));
});

router.get('/klines', async (req, res, next) => {
  try {
    const { pair, interval, limit } = req.query;
    if (!pair) {
      return res.status(400).json({ error: 'Pair parameter required' });
    }
    if (!interval) {
      return res.status(400).json({ error: 'Interval parameter required' });
    }
    if (!TIMEFRAMES.includes(interval)) {
      return res.status(400).json({ error: `Invalid interval. Supported: ${TIMEFRAMES.join(', ')}` });
    }

    const klines = await priceService.fetchOHLCV(pair, interval, parseInt(limit) || 200);
    res.json(klines);
  } catch (error) {
    next(error);
  }
});

router.get('/pairs', (req, res) => {
  res.json({
    active: pairService.getActivePairs(),
    all: pairService.getAllPairs(),
    count: pairService.getActivePairs().length,
    total: pairService.getAllPairs().length,
  });
});

router.get('/timeframes', (req, res) => {
  res.json({
    all: TIMEFRAMES,
    chart: CHART_TIMEFRAMES,
  });
});

module.exports = router;
