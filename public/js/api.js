const API_BASE = '';

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }

  return data;
}

const API = {
  async getTicker(pair) {
    return apiRequest(`/api/market/ticker?pair=${pair}`);
  },

  async getAllTickers() {
    return apiRequest('/api/market/ticker/all');
  },

  async getOrderBook(pair, limit = 20) {
    return apiRequest(`/api/market/orderbook?pair=${pair}&limit=${limit}`);
  },

  async getTrades(pair, limit = 50) {
    return apiRequest(`/api/market/trades?pair=${pair}&limit=${limit}`);
  },

  async getKlines(pair, interval, limit = 200) {
    return apiRequest(`/api/market/klines?pair=${pair}&interval=${interval}&limit=${limit}`);
  },

  async getTimeframes() {
    return apiRequest('/api/market/timeframes');
  },

  async getOpenOrders(pair = null) {
    const url = pair ? `/api/orders/open?pair=${pair}` : '/api/orders/open';
    return apiRequest(url);
  },

  async getOrderHistory(pair = null, page = 1, limit = 20) {
    let url = `/api/orders/history?page=${page}&limit=${limit}`;
    if (pair) url += `&pair=${pair}`;
    return apiRequest(url);
  },

  async createOrder(orderData) {
    return apiRequest('/api/orders', {
      method: 'POST',
      body: orderData,
    });
  },

  async cancelOrder(orderId) {
    return apiRequest(`/api/orders/${orderId}`, { method: 'DELETE' });
  },

  async cancelAllOrders(pair = null) {
    const url = pair ? `/api/orders/cancel-all?pair=${pair}` : '/api/orders/cancel-all';
    return apiRequest(url, { method: 'DELETE' });
  },

  async getBalances() {
    return apiRequest('/api/wallet/balances');
  },

  async deposit(currency, amount) {
    return apiRequest('/api/wallet/deposit', {
      method: 'POST',
      body: { currency, amount: parseFloat(amount) },
    });
  },

  async withdraw(currency, amount, address) {
    return apiRequest('/api/wallet/withdraw', {
      method: 'POST',
      body: { currency, amount: parseFloat(amount), address },
    });
  },

  async getTransactions(page = 1, limit = 20) {
    return apiRequest(`/api/wallet/transactions?page=${page}&limit=${limit}`);
  },

  async getProfile() {
    return apiRequest('/api/user/profile');
  },
};