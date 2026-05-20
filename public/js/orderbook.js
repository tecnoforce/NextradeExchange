class OrderBookRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentPair = 'BTC/USDT';
    this.bids = [];
    this.asks = [];
    this.lastPrice = 0;
    this.lastSide = 'buy';
    this.openOrders = [];
  }

  clear() {
    this.bids = [];
    this.asks = [];
    this.lastPrice = 0;
    if (this.container) {
      this.container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Cargando...</div>';
    }
  }

  setOpenOrders(orders) {
    this.openOrders = orders || [];
  }

  getOrdersAtPrice(price) {
    return this.openOrders.filter(order => {
      const orderPrice = parseFloat(order.price);
      const tolerance = Math.max(price * 0.000001, 0.05);
      return Math.abs(orderPrice - price) < tolerance;
    });
  }

  render(orderbook) {
    if (!this.container) return;

    this.bids = orderbook.bids || [];
    this.asks = orderbook.asks || [];

    const maxBidTotal = this.bids.reduce((sum, [, amount]) => sum + amount, 0);
    const maxAskTotal = this.asks.reduce((sum, [, amount]) => sum + amount, 0);
    const maxTotal = Math.max(maxBidTotal, maxAskTotal);

    let html = '';

    html += '<div class="orderbook-header"><span>Precio</span><span>Cantidad</span><span>Total</span></div>';

    const displayAsks = [...this.asks].reverse().slice(0, 20);
    let askCumulative = 0;
    displayAsks.forEach(([price, amount]) => {
      askCumulative += amount;
      const depthPercent = maxTotal > 0 ? (askCumulative / maxTotal) * 100 : 0;
      const ordersAtPrice = this.getOrdersAtPrice(price);
      const hasOrder = ordersAtPrice.length > 0;
      const marker = hasOrder
        ? `<span class="order-marker" title="${ordersAtPrice.map(o => `${o.side === 'buy' ? 'Compra' : 'Venta'} ${o.amount} @ ${o.price}`).join(' | ')}"></span>`
        : '';
      html += `<div class="orderbook-row ask${hasOrder ? ' has-order' : ''}" data-price="${price}">
        <div class="depth-bar" style="width: ${depthPercent}%"></div>
        <span class="price">${marker}${this.formatPrice(price)}</span>
        <span class="amount">${this.formatAmount(amount)}</span>
        <span class="total">${this.formatTotal(price * amount)}</span>
      </div>`;
    });

    if (this.bids.length > 0 && this.asks.length > 0) {
      const spread = this.asks[0][0] - this.bids[0][0];
      const spreadPercent = this.asks[0][0] > 0 ? (spread / this.asks[0][0] * 100).toFixed(4) : 0;
      const direction = this.lastSide === 'buy' ? 'up' : 'down';
      const arrow = this.lastSide === 'buy' ? '↑' : '↓';
      html += `<div class="orderbook-spread ${direction}">
        ${this.formatPrice(this.lastPrice || this.bids[0][0])} <span class="arrow">${arrow}</span>
        <span style="font-size:11px;color:var(--text-secondary);margin-left:8px;">Spread: ${spreadPercent}%</span>
      </div>`;
    }

    let bidCumulative = 0;
    this.bids.slice(0, 20).forEach(([price, amount]) => {
      bidCumulative += amount;
      const depthPercent = maxTotal > 0 ? (bidCumulative / maxTotal) * 100 : 0;
      const ordersAtPrice = this.getOrdersAtPrice(price);
      const hasOrder = ordersAtPrice.length > 0;
      const marker = hasOrder
        ? `<span class="order-marker" title="${ordersAtPrice.map(o => `${o.side === 'buy' ? 'Compra' : 'Venta'} ${o.amount} @ ${o.price}`).join(' | ')}"></span>`
        : '';
      html += `<div class="orderbook-row bid${hasOrder ? ' has-order' : ''}" data-price="${price}">
        <div class="depth-bar" style="width: ${depthPercent}%"></div>
        <span class="price">${marker}${this.formatPrice(price)}</span>
        <span class="amount">${this.formatAmount(amount)}</span>
        <span class="total">${this.formatTotal(price * amount)}</span>
      </div>`;
    });

    const buyPercent = maxTotal > 0 ? (maxBidTotal / (maxBidTotal + maxAskTotal) * 100).toFixed(2) : 50;
    const sellPercent = (100 - buyPercent).toFixed(2);
    html += `<div class="orderbook-depth-bar">
      <div class="buy-depth" style="width: ${buyPercent}%"></div>
      <div class="sell-depth" style="width: ${sellPercent}%"></div>
    </div>`;

    this.container.innerHTML = html;

    this.container.querySelectorAll('.orderbook-row').forEach(row => {
      row.addEventListener('click', () => {
        const price = row.dataset.price;
        if (window.setOrderFormPrice) {
          window.setOrderFormPrice(price);
        }
      });
    });
  }

  formatPrice(price) {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(8);
  }

  formatAmount(amount) {
    if (amount >= 1) return amount.toFixed(4);
    return amount.toFixed(8);
  }

  formatTotal(total) {
    if (total >= 1000000) return (total / 1000000).toFixed(2) + 'M';
    if (total >= 1000) return (total / 1000).toFixed(2) + 'K';
    return total.toFixed(2);
  }
}
