const { CHART_TIMEFRAMES, ORDERBOOK_DEPTH, RECENT_TRADES_LIMIT, ORDERBOOK_PAIRS_PER_CYCLE, TRADES_PAIRS_PER_CYCLE, FALLBACK_PAIRS } = require('../config/constants');
const orderBookService = require('./orderBookService');
const notificationService = require('./notificationService');
const pairService = require('./pairService');

class PriceService {
  constructor() {
    this.exchange = null;
    this.tickers = new Map();
    this.recentTrades = new Map();
    this.isRunning = false;
    this.currentCandles = new Map();
    this.candleTimestamp = new Map();
    this.obOffset = 0;
    this.tradesOffset = 0;

    this.timeframeSeconds = {
      '1s': 1, '1m': 60, '3m': 180, '5m': 300, '15m': 900, '30m': 1800,
      '1h': 3600, '2h': 7200, '4h': 14400, '6h': 21600, '8h': 28800,
      '12h': 43200, '1d': 86400, '3d': 259200, '1w': 604800, '1M': 2592000,
    };
  }

  initMaps(pairs) {
    pairs.forEach(pair => {
      if (!this.recentTrades.has(pair)) {
        this.recentTrades.set(pair, []);
      }
      CHART_TIMEFRAMES.forEach(tf => {
        const key = `${pair}:${tf}`;
        if (!this.currentCandles.has(key)) {
          this.currentCandles.set(key, null);
          this.candleTimestamp.set(key, 0);
        }
      });
    });
  }

  async init(exchange) {
    this.exchange = exchange;
    const pairs = pairService.getActivePairs();
    this.initMaps(pairs);
    console.log(`[PriceService] Initialized with ${pairs.length} active pairs`);
    this.startPolling();
  }

  getExchange() {
    return this.exchange;
  }

  startPolling() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.poll();
  }

  async poll() {
    if (!this.exchange || !this.isRunning) return;

    const activePairs = pairService.getActivePairs();
    if (!activePairs.length) {
      setTimeout(() => this.poll(), 3000);
      return;
    }

    try {
      const allTickers = await this.exchange.fetchTickers();
      const tickerPromises = activePairs.map(async (pair) => {
        try {
          const raw = allTickers[pair] || allTickers[pair.replace('/', '')];
          if (raw) {
            this.tickers.set(pair, raw);
            notificationService.emitTickerUpdate(pair, this.formatTicker(raw));
            const lastPrice = parseFloat(raw.last || raw.close || 0);
            if (lastPrice > 0) this.updateChartCandle(pair, lastPrice);
          }
        } catch (e) {
          console.error(`[PriceService] Ticker error for ${pair}:`, e.message);
        }
      });

      const obCount = Math.min(ORDERBOOK_PAIRS_PER_CYCLE, activePairs.length);
      const obBatch = [];
      for (let i = 0; i < obCount; i++) {
        const idx = (this.obOffset + i) % activePairs.length;
        obBatch.push(activePairs[idx]);
      }
      this.obOffset = (this.obOffset + obCount) % activePairs.length;

      const orderBookPromises = obBatch.map(async (pair) => {
        try {
          const orderbook = await this.exchange.fetchOrderBook(pair, ORDERBOOK_DEPTH);
          orderBookService.updateOrderBook(pair, orderbook);
          notificationService.emitOrderBookUpdate(pair, orderBookService.getOrderBook(pair));
        } catch (e) {
          console.error(`[PriceService] OrderBook error for ${pair}:`, e.message);
        }
      });

      const tradesCount = Math.min(TRADES_PAIRS_PER_CYCLE, activePairs.length);
      const tradesBatch = [];
      for (let i = 0; i < tradesCount; i++) {
        const idx = (this.tradesOffset + i) % activePairs.length;
        tradesBatch.push(activePairs[idx]);
      }
      this.tradesOffset = (this.tradesOffset + tradesCount) % activePairs.length;

      const tradesPromises = tradesBatch.map(async (pair) => {
        try {
          const trades = await this.exchange.fetchTrades(pair, undefined, RECENT_TRADES_LIMIT);
          const formatted = trades.map(t => ({
            price: parseFloat(t.price),
            amount: parseFloat(t.amount),
            side: t.side,
            timestamp: t.timestamp,
          }));
          this.recentTrades.set(pair, formatted);
          notificationService.emitRecentTrades(pair, formatted);
        } catch (e) {
          console.error(`[PriceService] Trades error for ${pair}:`, e.message);
        }
      });

      await Promise.allSettled([...tickerPromises, ...orderBookPromises, ...tradesPromises]);
    } catch (error) {
      console.error('[PriceService] Poll error:', error.message);
    }

    setTimeout(() => this.poll(), 3000);
  }

  formatTicker(ticker) {
    return {
      pair: ticker.symbol || ticker.pair,
      price: parseFloat((ticker.last || ticker.close || 0).toFixed(8)),
      change24h: parseFloat((ticker.change || 0).toFixed(8)),
      percentage24h: parseFloat((ticker.percentage || 0).toFixed(2)),
      high24h: parseFloat((ticker.high || 0).toFixed(8)),
      low24h: parseFloat((ticker.low || 0).toFixed(8)),
      volume24h: parseFloat((ticker.baseVolume || 0).toFixed(8)),
      quoteVolume24h: parseFloat((ticker.quoteVolume || 0).toFixed(2)),
      bid: parseFloat((ticker.bid || 0).toFixed(8)),
      ask: parseFloat((ticker.ask || 0).toFixed(8)),
      timestamp: ticker.timestamp || Date.now(),
    };
  }

  async fetchOHLCV(pair, timeframe = '1h', limit = 200) {
    if (!this.exchange) throw new Error('Exchange not initialized');
    const ohlcv = await this.exchange.fetchOHLCV(pair, timeframe, undefined, limit);
    return ohlcv.map(([timestamp, open, high, low, close, volume]) => ({
      time: Math.floor(timestamp / 1000),
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume),
    }));
  }

  getTicker(pair) {
    let ticker = this.tickers.get(pair);
    if (!ticker && this.exchange) {
      this.exchange.fetchTicker(pair).then(t => {
        if (t) {
          this.tickers.set(pair, t);
          notificationService.emitTickerUpdate(pair, this.formatTicker(t));
        }
      }).catch(() => {});
    }
    return ticker ? this.formatTicker(ticker) : null;
  }

  getAllTickers() {
    const active = pairService.getActivePairs();
    const result = {};
    active.forEach(pair => {
      const ticker = this.tickers.get(pair);
      if (ticker) {
        result[pair] = this.formatTicker(ticker);
      }
    });
    return result;
  }

  getRecentTrades(pair) {
    return this.recentTrades.get(pair) || [];
  }

  updateChartCandle(pair, price) {
    const now = Math.floor(Date.now() / 1000);

    CHART_TIMEFRAMES.forEach(tf => {
      const seconds = this.timeframeSeconds[tf] || 3600;
      const candleTime = Math.floor(now / seconds) * seconds;
      const key = `${pair}:${tf}`;
      const lastTime = this.candleTimestamp.get(key) || 0;
      let candle = this.currentCandles.get(key);

      if (candleTime !== lastTime) {
        if (candle) {
          notificationService.emitChartUpdate(pair, tf, { ...candle, isFinal: true });
        }
        candle = {
          time: candleTime,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 0,
        };
        this.currentCandles.set(key, candle);
        this.candleTimestamp.set(key, candleTime);
      }

      candle.close = price;
      candle.high = Math.max(candle.high, price);
      candle.low = Math.min(candle.low, price);
      candle.volume += Math.random() * 0.1;

      notificationService.emitChartUpdate(pair, tf, { ...candle, isFinal: false });
    });
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = new PriceService();
