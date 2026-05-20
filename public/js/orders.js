let ordersSocketConnected = false;

socketManager.connect();

socketManager.on('connect', () => {
  ordersSocketConnected = true;
  socketManager.subscribeAll();
});

socketManager.on('order:update', () => {
  if (typeof loadOrders === 'function') {
    loadOrders();
  }
});

socketManager.on('ticker:update', (data) => {
  if (data.pair) {
    if (!window.allTickers) window.allTickers = {};
    window.allTickers[data.pair] = data;
  }
});