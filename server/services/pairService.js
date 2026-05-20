const { createBinanceExchange } = require('../config/exchange');
const { QUOTE_CURRENCIES, PAIR_ALLOCATION, FALLBACK_PAIRS } = require('../config/constants');

const REFRESH_INTERVAL = parseInt(process.env.PAIRS_REFRESH_INTERVAL) || 600000;

let activePairs = [];
let allSupportedPairs = [];
let isInitialized = false;

async function init() {
  const exchange = createBinanceExchange();
  await exchange.loadMarkets();
  console.log('[PairService] Markets loaded from Binance');

  await refresh(exchange);

  setInterval(async () => {
    try {
      await refresh(exchange);
      console.log(`[PairService] Refreshed: ${activePairs.length} active / ${allSupportedPairs.length} total pairs`);
    } catch (e) {
      console.error('[PairService] Refresh error:', e.message);
    }
  }, REFRESH_INTERVAL);

  isInitialized = true;
  return exchange;
}

async function refresh(exchange) {
  const allMarkets = exchange.markets;
  const grouped = {};

  QUOTE_CURRENCIES.forEach(q => grouped[q] = []);

  for (const [symbol, market] of Object.entries(allMarkets)) {
    const parts = symbol.split('/');
    if (parts.length !== 2) continue;
    const quote = parts[1];
    if (grouped[quote] && market.active && market.spot) {
      grouped[quote].push(symbol);
    }
  }

  QUOTE_CURRENCIES.forEach(q => grouped[q].sort());

  const all = [];
  QUOTE_CURRENCIES.forEach(q => all.push(...grouped[q]));
  allSupportedPairs = all;

  try {
    const tickers = await exchange.fetchTickers();
    const withVolume = [];

    for (const [symbol, ticker] of Object.entries(tickers)) {
      const parts = symbol.split('/');
      if (parts.length !== 2) continue;
      const quote = parts[1];
      if (grouped[quote]) {
        withVolume.push({
          pair: symbol,
          volume: parseFloat(ticker.quoteVolume || ticker.baseVolume || 0),
        });
      }
    }

    const selected = [];
    for (const quote of QUOTE_CURRENCIES) {
      const limit = PAIR_ALLOCATION[quote] || 5;
      const sorted = withVolume
        .filter(p => p.pair.endsWith(`/${quote}`))
        .sort((a, b) => b.volume - a.volume);
      selected.push(...sorted.slice(0, limit).map(p => p.pair));
    }

    activePairs = selected;
    const totalAlloc = Object.values(PAIR_ALLOCATION).reduce((a, b) => a + b, 0);
    console.log(`[PairService] Top ${activePairs.length} active (${totalAlloc} target)`);
    QUOTE_CURRENCIES.forEach(q => {
      const count = activePairs.filter(p => p.endsWith(`/${q}`)).length;
      console.log(`  ${q}: ${count}`);
    });
  } catch (e) {
    console.warn(`[PairService] fetchTickers failed (${e.message}), using fallback pairs`);
    activePairs = FALLBACK_PAIRS;
    allSupportedPairs = FALLBACK_PAIRS;
  }
}

function getActivePairs() {
  return activePairs;
}

function getAllPairs() {
  return allSupportedPairs;
}

function isActive(pair) {
  return activePairs.includes(pair);
}

function getPairIndex(pair) {
  return activePairs.indexOf(pair);
}

module.exports = {
  init,
  getActivePairs,
  getAllPairs,
  isActive,
  getPairIndex,
  get isInitialized() { return isInitialized; },
};
