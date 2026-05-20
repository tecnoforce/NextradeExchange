let allPairs = { active: [], all: [] };
let activePairs = [];

async function fetchPairs() {
  try {
    const resp = await fetch('/api/market/pairs');
    const data = await resp.json();
    allPairs = data;
    activePairs = data.active || [];
    return data;
  } catch (e) {
    console.warn('[Trade] Failed to fetch pairs, using fallback:', e.message);
    const fallback = ['BTC/USDT','ETH/USDT','BNB/USDT','SOL/USDT','XRP/USDT','ADA/USDT','DOGE/USDT','AVAX/USDT','DOT/USDT','MATIC/USDT','LINK/USDT','UNI/USDT','ATOM/USDT','LTC/USDT','NEAR/USDT','APT/USDT','ARB/USDT','OP/USDT','FIL/USDT','INJ/USDT'];
    activePairs = fallback;
    allPairs = { active: fallback, all: fallback };
    return allPairs;
  }
}

const CHART_TIMEFRAMES = ['1s', '1m', '5m', '15m', '1h', '4h', '1d', '1w'];

let currentPair = 'BTC/USDT';
let currentTimeframe = '1h';
let userBalances = {};
let chartManager = null;
let orderBookRenderer = null;
let orderForm = null;
let recentTrades = [];
let openOrders = [];
let currentPanelId = null;
let currentQuoteFilter = 'all';

function formatPrice(price) {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(8);
}

function formatAmount(amount) {
  if (amount >= 1) return amount.toFixed(4);
  return amount.toFixed(8);
}

function formatNumber(num) {
  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toFixed(2);
}

function updateHeader(ticker) {
  if (!ticker) return;

  const priceEl = document.getElementById('header-price');
  const changeEl = document.getElementById('header-change');
  const highEl = document.getElementById('header-high');
  const lowEl = document.getElementById('header-low');
  const volumeEl = document.getElementById('header-volume');
  const quoteVolEl = document.getElementById('header-quote-volume');

  if (priceEl) {
    priceEl.textContent = formatPrice(ticker.price);
    priceEl.className = `ticker-price ${ticker.change24h >= 0 ? 'up' : 'down'}`;
  }

  if (changeEl) {
    const sign = ticker.change24h >= 0 ? '+' : '';
    changeEl.textContent = `${sign}${formatPrice(ticker.change24h)} ${sign}${ticker.percentage24h.toFixed(2)}%`;
    changeEl.className = `ticker-change ${ticker.change24h >= 0 ? 'up' : 'down'}`;
  }

  if (highEl) highEl.textContent = formatPrice(ticker.high24h);
  if (lowEl) lowEl.textContent = formatPrice(ticker.low24h);
  if (volumeEl) volumeEl.textContent = formatNumber(ticker.volume24h);
  if (quoteVolEl) quoteVolEl.textContent = formatNumber(ticker.quoteVolume24h);
}

function updateMarketsList(tickers) {
  const container = document.getElementById('markets-list');
  if (!container) return;

  window.allTickers = tickers;

  const entries = Object.entries(tickers);
  const filtered = currentQuoteFilter === 'all'
    ? entries
    : entries.filter(([pair]) => pair.endsWith(`/${currentQuoteFilter}`));

  let html = '';
  const favorites = JSON.parse(localStorage.getItem('nextrade_favorites') || '[]');

  filtered.forEach(([pair, ticker]) => {
    const isFav = favorites.includes(pair);
    const changeClass = ticker.percentage24h >= 0 ? 'text-buy' : 'text-sell';
    const sign = ticker.percentage24h >= 0 ? '+' : '';

    html += `<div class="market-row" data-pair="${pair}" style="display:flex;align-items:center;padding:6px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:12px;">
      <span style="color:var(--text-muted);margin-right:4px;cursor:pointer;" class="fav-star ${isFav ? 'text-yellow' : ''}" data-pair="${pair}">★</span>
      <span style="flex:1;font-weight:500;">${pair.endsWith('/USDT') ? pair.replace('/USDT', '') : pair}</span>
      <span style="font-family:var(--font-mono);margin-right:8px;">${formatPrice(ticker.price)}</span>
      <span class="${changeClass}" style="font-family:var(--font-mono);font-size:11px;">${sign}${ticker.percentage24h.toFixed(2)}%</span>
    </div>`;
  });

  container.innerHTML = html;

  container.querySelectorAll('.market-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('fav-star')) return;
      selectPair(row.dataset.pair);
    });
  });

  container.querySelectorAll('.fav-star').forEach(star => {
    star.addEventListener('click', (e) => {
      e.stopPropagation();
      const pair = star.dataset.pair;
      toggleFavorite(pair);
    });
  });
}

function initMarketTabs() {
  document.querySelectorAll('.market-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.market-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentQuoteFilter = tab.dataset.quote;
      if (window.allTickers) updateMarketsList(window.allTickers);
    });
  });
}

function toggleFavorite(pair) {
  let favorites = JSON.parse(localStorage.getItem('nextrade_favorites') || '[]');
  if (favorites.includes(pair)) {
    favorites = favorites.filter(f => f !== pair);
  } else {
    favorites.push(pair);
  }
  localStorage.setItem('nextrade_favorites', JSON.stringify(favorites));
  updateMarketsList(window.allTickers || {});
}

function subscribeChart(pair, timeframe) {
  socketManager.subscribeChart(pair, timeframe);
}

function unsubscribeChart(pair, timeframe) {
  socketManager.unsubscribeChart(pair, timeframe);
}

function selectPair(pair) {
  if (pair === currentPair) return;
  const oldPair = currentPair;

  unsubscribeChart(oldPair, currentTimeframe);
  socketManager.unsubscribePair(oldPair);

  currentPair = pair;

  document.querySelectorAll('.market-row').forEach(row => {
    row.style.background = row.dataset.pair === pair ? 'var(--bg-hover)' : '';
  });

  const headerPairEl = document.getElementById('header-pair');
  if (headerPairEl) headerPairEl.textContent = pair;

  const baseCurrency = pair.split('/')[0];
  const amountUnitEl = document.getElementById('amount-unit');
  if (amountUnitEl) amountUnitEl.textContent = baseCurrency;

  if (chartManager) {
    chartManager.setPair(pair);
  }

  if (orderBookRenderer) {
    orderBookRenderer.currentPair = pair;
    orderBookRenderer.clear();
  }

  if (orderForm) {
    orderForm.setPair(pair);
  }

  socketManager.subscribePair(pair);

  subscribeChart(pair, currentTimeframe);

  recentTrades = [];

  loadOpenOrders();
  loadRecentTrades(pair);
}

function updateRecentTrades(trades) {
  const container = document.getElementById('recent-trades');
  if (!container) return;

  if (trades && trades.trades) {
    trades.trades.forEach(t => {
      if (!recentTrades.find(rt => rt.timestamp === t.timestamp && rt.price === t.price)) {
        recentTrades.unshift(t);
      }
    });
    recentTrades = recentTrades.slice(0, 50);
  }

  let html = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;padding:4px 8px;font-size:11px;color:var(--text-muted);border-bottom:1px solid var(--border);"><span>Precio</span><span>Cantidad</span><span style="text-align:right;">Tiempo</span></div>';

  recentTrades.slice(0, 30).forEach(trade => {
    const sideClass = trade.side === 'buy' ? 'text-buy' : 'text-sell';
    const time = new Date(trade.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;padding:2px 8px;font-size:11px;font-family:var(--font-mono);">
      <span class="${sideClass}">${formatPrice(trade.price)}</span>
      <span>${formatAmount(trade.amount)}</span>
      <span style="text-align:right;color:var(--text-secondary);">${time}</span>
    </div>`;
  });

  container.innerHTML = html;
}

async function loadRecentTrades(pair) {
  try {
    const trades = await API.getTrades(pair, 50);
    recentTrades = trades;
    updateRecentTrades({ trades });
  } catch (error) {
    console.error('[Trade] Failed to load trades:', error);
  }
}

async function loadOpenOrders() {
  try {
    const orders = await API.getOpenOrders(currentPair);
    openOrders = orders;
    renderOpenOrders(orders);
    if (orderBookRenderer) {
      orderBookRenderer.setOpenOrders(orders);
    }
    const countEl = document.getElementById('open-orders-count');
    if (countEl) countEl.textContent = orders.length;
  } catch (error) {
    console.error('[Trade] Failed to load open orders:', error);
  }
}

function renderOpenOrders(orders) {
  const container = document.getElementById('open-orders-body');
  if (!container) return;

  if (!orders || orders.length === 0) {
    container.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted);">No tienes pedidos abiertos.</td></tr>';
    return;
  }

  let html = '';
  orders.forEach(order => {
    const sideClass = order.side === 'buy' ? 'text-buy' : 'text-sell';
    const statusClass = order.status === 'filled' ? 'text-buy' : order.status === 'cancelled' ? 'text-sell' : 'text-yellow';
    const time = new Date(order.createdAt).toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const exchangeBadge = order.exchangeOrderId
      ? `<span style="color:var(--accent-green);font-size:10px;" title="Binance Testnet ID: ${order.exchangeOrderId}">● REAL</span>`
      : '';

    html += `<tr>
      <td>${time}</td>
      <td>${order.pair}</td>
      <td style="text-transform:capitalize;">${order.type}</td>
      <td class="${sideClass}" style="text-transform:capitalize;">${order.side}</td>
      <td>${formatPrice(parseFloat(order.price))}</td>
      <td>${formatAmount(parseFloat(order.amount))}</td>
      <td>${formatAmount(parseFloat(order.filled))}</td>
      <td class="${statusClass}" style="text-transform:capitalize;">${order.status} ${exchangeBadge}</td>
      <td>${order.status === 'pending' || order.status === 'partial'
        ? `<button class="cancel-btn" data-id="${order.id}">Cancelar</button>`
        : '-'}</td>
    </tr>`;
  });

  container.innerHTML = html;

  container.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.id;
      btn.disabled = true;
      btn.textContent = 'Cancelando...';
      
      try {
        await API.cancelOrder(orderId);
        
        await loadOpenOrders();
        
        await new Promise(r => setTimeout(r, 2000));
        
        const currentOrders = await API.getOpenOrders(currentPair);
        const stillExists = currentOrders.some(o => o.id === orderId);
        
        if (stillExists) {
          throw new Error('La orden aún existe en el exchange. Reintentando...');
        }
        
        await new Promise(r => setTimeout(r, 3000));
        
        const balances = await API.getBalances();
        userBalances = {};
        balances.forEach(b => {
          userBalances[b.currency] = {
            total: b.total,
            available: b.available,
            inOrders: b.inOrders
          };
        });
        window.userBalances = userBalances;
        
        const balanceEl = document.getElementById('user-balance');
        const availableBalance = userBalances['USDT']?.available ?? userBalances['USDT']?.total ?? 0;
        if (balanceEl) {
          balanceEl.textContent = `${availableBalance.toFixed(2)} USDT`;
        }
        
        if (orderForm) orderForm.updateBalanceDisplay();
        
        const openCountEl = document.getElementById('open-orders-count');
        if (openCountEl) {
          openCountEl.textContent = currentOrders.length;
        }
        
        if (orderForm && orderForm.showToast) {
          orderForm.showToast(`Orden cancelada. Balance disponible: ${availableBalance.toFixed(2)} USDT`, 'success');
        } else {
          alert(`Orden cancelada. Balance disponible: ${availableBalance.toFixed(2)} USDT`);
        }
      } catch (error) {
        await loadOpenOrders();
        
        if (orderForm && orderForm.showToast) {
          orderForm.showToast('Error al cancelar: ' + error.message, 'error');
        } else {
          alert('Error al cancelar: ' + error.message);
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Cancelar';
      }
    });
  });
}

const panelLoaded = {};

function reloadCurrentPanel() {
  if (!currentPanelId) return;
  const panel = document.getElementById(currentPanelId);
  if (panel) {
    loadPanelData(currentPanelId, panel);
  }
}

function initBottomTabs() {
  document.querySelectorAll('.bottom-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.bottom-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const panelId = tab.dataset.panel;
      if (!panelId) return;

      document.querySelectorAll('.bottom-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById(panelId);
      if (!panel) return;
      panel.classList.add('active');
      currentPanelId = panelId;

      if (!panelLoaded[panelId]) {
        panelLoaded[panelId] = true;
        loadPanelData(panelId, panel);
      }
    });
  });
}

async function loadPanelData(panelId, panel) {
  switch (panelId) {
    case 'panel-order-history':
      await loadOrderHistoryPanel(panel);
      break;
    case 'panel-trade-history':
      await loadTradeHistoryPanel(panel);
      break;
    case 'panel-portfolio':
      await loadPortfolioPanel(panel);
      break;
  }
}

function showPanelLoading(panel) {
  panel.innerHTML = '<div class="loading-spinner">Cargando...</div>';
}

async function loadOrderHistoryPanel(panel) {
  showPanelLoading(panel);
  try {
    const data = await API.getOrderHistory(null, 1, 100);
    const orders = data.orders || data || [];
    if (!orders.length) {
      panel.innerHTML = '<div class="panel-placeholder">No hay historial de pedidos.</div>';
      return;
    }
    let html = `<table class="orders-table"><thead><tr>
      <th>Fecha</th><th>Par</th><th>Tipo</th><th>Lado</th>
      <th>Precio</th><th>Cantidad</th><th>Completado</th><th>Estado</th>
    </tr></thead><tbody>`;
    orders.forEach(o => {
      const time = new Date(o.createdAt).toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const sideClass = o.side === 'buy' ? 'text-buy' : 'text-sell';
      const statusClass = o.status === 'filled' ? 'text-buy' : o.status === 'cancelled' ? 'text-sell' : 'text-yellow';
      html += `<tr>
        <td>${time}</td>
        <td>${o.pair}</td>
        <td style="text-transform:capitalize;">${o.type}</td>
        <td class="${sideClass}" style="text-transform:capitalize;">${o.side}</td>
        <td>${formatPrice(parseFloat(o.price))}</td>
        <td>${formatAmount(parseFloat(o.amount))}</td>
        <td>${formatAmount(parseFloat(o.filled))}</td>
        <td class="${statusClass}" style="text-transform:capitalize;">${o.status}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    panel.innerHTML = html;
  } catch (error) {
    console.error('[Trade] Failed to load order history:', error);
    panel.innerHTML = '<div class="panel-placeholder">Error al cargar historial de pedidos.</div>';
  }
}

async function loadTradeHistoryPanel(panel) {
  showPanelLoading(panel);
  try {
    const trades = await API.getTrades(currentPair, 100);
    const list = trades.trades || trades || [];
    if (!list.length) {
      panel.innerHTML = '<div class="panel-placeholder">No hay historial comercial.</div>';
      return;
    }
    let html = `<table class="orders-table"><thead><tr>
      <th>Hora</th><th>Precio</th><th>Cantidad</th><th>Total</th><th>Lado</th>
    </tr></thead><tbody>`;
    list.slice(0, 100).forEach(t => {
      const time = new Date(t.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const sideClass = t.side === 'buy' ? 'text-buy' : 'text-sell';
      const price = parseFloat(t.price);
      const amount = parseFloat(t.amount);
      html += `<tr>
        <td>${time}</td>
        <td>${formatPrice(price)}</td>
        <td>${formatAmount(amount)}</td>
        <td>${formatPrice(price * amount)}</td>
        <td class="${sideClass}" style="text-transform:capitalize;">${t.side}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    panel.innerHTML = html;
  } catch (error) {
    console.error('[Trade] Failed to load trade history:', error);
    panel.innerHTML = '<div class="panel-placeholder">Error al cargar historial comercial.</div>';
  }
}

async function loadPortfolioPanel(panel) {
  showPanelLoading(panel);
  try {
    const balances = await API.getBalances();
    const tickers = await API.getAllTickers();
    if (!balances || !balances.length) {
      panel.innerHTML = '<div class="panel-placeholder">No hay datos de cartera.</div>';
      return;
    }
    let html = '<div class="portfolio-grid">';
    balances.forEach(b => {
      const total = parseFloat(b.total) || 0;
      const available = parseFloat(b.available) || 0;
      const inOrders = parseFloat(b.inOrders) || 0;
      if (total === 0 && inOrders === 0) return;
      let usdtValue = '';
      if (b.currency === 'USDT') {
        usdtValue = `$${total.toFixed(2)}`;
      } else if (tickers && tickers[`${b.currency}/USDT`]) {
        const price = tickers[`${b.currency}/USDT`].price;
        usdtValue = `$${(total * price).toFixed(2)}`;
      }
      html += `<div class="portfolio-card">
        <div class="currency">${b.currency}</div>
        <div class="balance-row"><span>Total</span><span class="value">${total.toFixed(8)}</span></div>
        <div class="balance-row"><span>Disponible</span><span class="value">${available.toFixed(8)}</span></div>
        <div class="balance-row"><span>En órdenes</span><span class="value">${inOrders.toFixed(8)}</span></div>
        ${usdtValue ? `<div class="balance-row"><span>Valor USDT</span><span class="value">${usdtValue}</span></div>` : ''}
      </div>`;
    });
    html += '</div>';
    panel.innerHTML = html;
  } catch (error) {
    console.error('[Trade] Failed to load portfolio:', error);
    panel.innerHTML = '<div class="panel-placeholder">Error al cargar valores en cartera.</div>';
  }
}

async function loadBalances() {
  try {
    const balances = await API.getBalances();
    userBalances = {};
    balances.forEach(b => {
      userBalances[b.currency] = {
        total: b.total,
        available: b.available,
        inOrders: b.inOrders
      };
    });
    window.userBalances = userBalances;

    const balanceEl = document.getElementById('user-balance');
    if (balanceEl) {
      const availableBalance = userBalances['USDT']?.available ?? userBalances['USDT'] ?? 0;
      balanceEl.textContent = `${availableBalance.toFixed(2)} USDT`;
    }
    if (orderForm) orderForm.updateBalanceDisplay();
  } catch (error) {
    console.error('[Trade] Failed to load balances:', error);
  }
}

async function refreshBalances() {
  await loadBalances();
}
window.refreshBalances = refreshBalances;

async function init() {
  await fetchPairs();

  if (activePairs.length > 0 && !activePairs.includes(currentPair)) {
    currentPair = activePairs[0];
  }

  socketManager.connect();

  chartManager = new ChartManager('chart');
  chartManager.init();

  orderBookRenderer = new OrderBookRenderer('orderbook-content');
  orderForm = new OrderForm();
  orderForm.init();
  window.setOrderFormPrice = (price) => orderForm.setPrice(price);
  window.loadOpenOrders = loadOpenOrders;

  await loadBalances();

  socketManager.on('ticker:update', (data) => {
    if (data.pair) {
      if (!window.allTickers) window.allTickers = {};
      window.allTickers[data.pair] = data;
      updateMarketsList(window.allTickers);
    }
    if (data.pair === currentPair || data.pair === currentPair.replace('/', '')) {
      updateHeader(data);
    }
  });

  socketManager.on('orderbook:update', (data) => {
    if (data.pair === currentPair || data.pair === currentPair.replace('/', '')) {
      orderBookRenderer.render(data);
    }
  });

  socketManager.on('trades:new', (data) => {
    if (data.pair === currentPair || data.pair === currentPair.replace('/', '')) {
      updateRecentTrades({ trades: [data] });
    }
    if (currentPanelId === 'panel-trade-history') {
      loadTradeHistoryPanel(document.getElementById('panel-trade-history'));
    }
  });

  socketManager.on('order:update', (data) => {
    loadOpenOrders();
    refreshBalances();
    if (currentPanelId === 'panel-order-history') reloadCurrentPanel();
  });

  socketManager.on('balance:update', async (data) => {
    await refreshBalances();
    if (currentPanelId === 'panel-portfolio') reloadCurrentPanel();
  });

  socketManager.on('chart:update', (data) => {
    if (data.pair === currentPair && data.timeframe === currentTimeframe) {
      if (chartManager) chartManager.onChartUpdate(data);
    }
  });

  document.querySelectorAll('.chart-toolbar .timeframes button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-toolbar .timeframes button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const prevTf = currentTimeframe;
      currentTimeframe = btn.dataset.tf;
      if (chartManager) chartManager.setTimeframe(currentTimeframe);
      if (socketManager.connected) {
        unsubscribeChart(currentPair, prevTf);
        subscribeChart(currentPair, currentTimeframe);
      }
    });
  });

  const searchInput = document.getElementById('market-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.market-row').forEach(row => {
        const pair = row.dataset.pair.toLowerCase();
        row.style.display = pair.includes(query) ? 'flex' : 'none';
      });
    });
  }

  const cancelAllBtn = document.getElementById('cancel-all-orders');
  if (cancelAllBtn) {
    cancelAllBtn.addEventListener('click', async () => {
      if (!confirm('¿Cancelar todas las órdenes abiertas?')) return;
      
      cancelAllBtn.disabled = true;
      cancelAllBtn.textContent = 'Cancelando...';
      
      try {
        await API.cancelAllOrders(currentPair);
        
        await loadOpenOrders();
        
        await new Promise(r => setTimeout(r, 2000));
        
        const currentOrders = await API.getOpenOrders(currentPair);
        
        if (currentOrders.length > 0) {
          throw new Error(`${currentOrders.length} órdenes aún existen en el exchange`);
        }
        
        await new Promise(r => setTimeout(r, 3000));
        
        const balances = await API.getBalances();
        userBalances = {};
        balances.forEach(b => {
          userBalances[b.currency] = {
            total: b.total,
            available: b.available,
            inOrders: b.inOrders
          };
        });
        window.userBalances = userBalances;
        
        const balanceEl = document.getElementById('user-balance');
        const availableBalance = userBalances['USDT']?.available ?? userBalances['USDT']?.total ?? 0;
        if (balanceEl) {
          balanceEl.textContent = `${availableBalance.toFixed(2)} USDT`;
        }
        
        if (orderForm) orderForm.updateBalanceDisplay();
        
        const openCountEl = document.getElementById('open-orders-count');
        if (openCountEl) openCountEl.textContent = '0';
        
        if (orderForm && orderForm.showToast) {
          orderForm.showToast(`Todas las órdenes canceladas. Balance disponible: ${availableBalance.toFixed(2)} USDT`, 'success');
        } else {
          alert(`Todas las órdenes canceladas. Balance disponible: ${availableBalance.toFixed(2)} USDT`);
        }
      } catch (error) {
        await loadOpenOrders();
        
        if (orderForm && orderForm.showToast) {
          orderForm.showToast('Error: ' + error.message, 'error');
        } else {
          alert('Error: ' + error.message);
        }
      } finally {
        cancelAllBtn.disabled = false;
        cancelAllBtn.textContent = 'Cancelar todo';
      }
    });
  }

  socketManager.subscribePair(currentPair);

  await chartManager.loadData(currentPair, currentTimeframe);
  subscribeChart(currentPair, currentTimeframe);

  const allTickers = await API.getAllTickers();
  updateMarketsList(allTickers);
  updateHeader(allTickers[currentPair]);

  loadOpenOrders();
  loadRecentTrades(currentPair);
  initBottomTabs();
  initMarketTabs();

  setInterval(async () => {
    try {
      const allTickers = await API.getAllTickers();
      updateMarketsList(allTickers);
      if (allTickers[currentPair]) {
        updateHeader(allTickers[currentPair]);
      }
    } catch (error) {
      console.error('[Trade] Ticker refresh error:', error);
    }
  }, 60000);

  setInterval(async () => {
    try {
      await refreshBalances();
    } catch (error) {
      console.error('[Trade] Balance refresh error:', error);
    }
  }, 10000);

  setInterval(async () => {
    try {
      await loadOpenOrders();
    } catch (error) {
      console.error('[Trade] Orders refresh error:', error);
    }
  }, 10000);
}

document.addEventListener('DOMContentLoaded', init);
