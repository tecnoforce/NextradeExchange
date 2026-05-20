const ccxt = require('ccxt');

function createBinanceExchange() {
  const apiKey = process.env.BINANCE_TESTNET_API_KEY;
  const secret = process.env.BINANCE_TESTNET_SECRET;
  const dataSource = process.env.DATA_SOURCE || 'simulated';

  const config = {
    enableRateLimit: true,
    options: {
      defaultType: 'spot',
    },
  };

  if (apiKey && secret) {
    config.apiKey = apiKey;
    config.secret = secret;
  }

  const exchange = new ccxt.binance(config);

  if (dataSource === 'real' && apiKey && secret) {
    exchange.setSandboxMode(true);

    const BINANCE_REST_URL = (process.env.BINANCE_REST_URL || 'https://demo-api.binance.com').replace(/\/+$/, '');
    const BINANCE_WS_URL = (process.env.BINANCE_WS_URL || 'https://demo-ws-api.binance.com').replace(/\/+$/, '');
    const restHost = BINANCE_REST_URL.replace(/^https?:\/\//, '');
    const wsHost = BINANCE_WS_URL.replace(/^https?:\/\//, '');

    const walkUrls = (obj) => {
      if (typeof obj !== 'object' || obj === null) return;
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key]
            .replace('testnet.binance.vision', restHost)
            .replace('stream.binance.com:9443', wsHost);
        } else if (typeof obj[key] === 'object') {
          walkUrls(obj[key]);
        }
      }
    };
    walkUrls(exchange.urls);
    console.log(`[Exchange] Connected to Binance Spot Testnet (${restHost})`);
  } else if (dataSource === 'real') {
    console.log('[Exchange] WARNING: DATA_SOURCE=real but no API keys. Falling back to public data only.');
  } else {
    console.log('[Exchange] Running in SIMULATED mode. No external API calls.');
  }

  return exchange;
}

module.exports = { createBinanceExchange };
