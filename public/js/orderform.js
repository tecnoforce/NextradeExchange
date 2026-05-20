class OrderForm {
  constructor() {
    this.currentSide = 'buy';
    this.currentType = 'limit';
    this.currentPair = 'BTC/USDT';
    this.balance = 0;
    this.sliderPercent = 0;
    this.currentPrice = 0;
    this.toastContainer = null;
  }

  init() {
    this.createToastContainer();
    this.bindEvents();
    this.updateUI();
    this.updatePriceFromTicker();
    setTimeout(() => this.fetchPriceDirectly(), 2000);
  }

  createToastContainer() {
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(container);
      this.toastContainer = container;
    } else {
      this.toastContainer = document.getElementById('toast-container');
    }
  }

  showToast(message, type = 'success') {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#0ecb81' : type === 'error' ? '#f6465d' : '#f0b90b';
    toast.style.cssText = `background:${bgColor};color:#000;padding:10px 16px;border-radius:4px;font-size:12px;font-weight:500;max-width:320px;box-shadow:0 4px 12px rgba(0,0,0,0.4);animation:slideIn 0.3s ease;`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  updatePriceFromTicker() {
    const tryFill = () => {
      const allTickers = window.allTickers || {};
      const ticker = allTickers[this.currentPair];
      if (ticker && ticker.price > 0) {
        this.currentPrice = ticker.price;
        const priceInput = document.getElementById('order-price');
        if (priceInput && !priceInput.value) {
          priceInput.value = this.currentPrice;
          this.calculateTotal();
        }
      } else {
        setTimeout(tryFill, 1000);
      }
    };
    tryFill();
  }

  async fetchPriceDirectly() {
    try {
      const ticker = await API.getTicker(this.currentPair);
      if (ticker && ticker.price > 0) {
        this.currentPrice = ticker.price;
        const priceInput = document.getElementById('order-price');
        if (priceInput && !priceInput.value) {
          priceInput.value = this.currentPrice;
          this.calculateTotal();
        }
      }
    } catch (e) {
      console.warn('[OrderForm] Could not fetch price:', e.message);
    }
  }

  bindEvents() {
    document.querySelectorAll('.orderform-tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.orderform-tabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentType = tab.dataset.type;
        this.updateUI();
      });
    });

    document.querySelectorAll('.orderform-side-tabs .side-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.orderform-side-tabs .side-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentSide = tab.dataset.side;
        this.updateUI();
      });
    });

    document.querySelectorAll('.orderform-slider button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.orderform-slider button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.sliderPercent = parseInt(btn.dataset.percent);
        this.calculateFromSlider();
      });
    });

    const priceInput = document.getElementById('order-price');
    const amountInput = document.getElementById('order-amount');
    const totalInput = document.getElementById('order-total');

    if (priceInput) {
      priceInput.addEventListener('input', () => {
        this.currentPrice = parseFloat(priceInput.value) || 0;
        this.calculateTotal();
      });
    }
    if (amountInput) {
      amountInput.addEventListener('input', () => this.calculateTotal());
    }
    if (totalInput) {
      totalInput.addEventListener('input', () => this.calculateAmount());
    }

    const submitBtn = document.getElementById('order-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitOrder());
    }
  }

  updateUI() {
    const priceGroup = document.getElementById('price-group');
    const stopPriceGroup = document.getElementById('stop-price-group');

    if (priceGroup) {
      priceGroup.style.display = this.currentType === 'market' ? 'none' : 'block';
    }
    if (stopPriceGroup) {
      stopPriceGroup.style.display = this.currentType === 'stop_limit' ? 'block' : 'none';
    }

    const baseCurrency = this.currentPair.split('/')[0];

    const submitBtn = document.getElementById('order-submit');
    if (submitBtn) {
      submitBtn.className = `orderform-submit ${this.currentSide}`;
      submitBtn.textContent = this.currentSide === 'buy'
        ? `Compra ${baseCurrency}`
        : `Vender ${baseCurrency}`;
    }

    const amountUnitEl = document.getElementById('amount-unit');
    if (amountUnitEl) amountUnitEl.textContent = baseCurrency;

    this.updateBalanceDisplay();
    this.updatePriceFromTicker();
  }

  updateBalanceDisplay() {
    const [base, quote] = this.currentPair.split('/');
    const balanceEl = document.getElementById('available-balance');
    if (balanceEl && window.userBalances) {
      const bal = this.currentSide === 'buy'
        ? (window.userBalances[quote]?.available ?? window.userBalances[quote] ?? 0)
        : (window.userBalances[base]?.available ?? window.userBalances[base] ?? 0);
      this.balance = bal;
      balanceEl.textContent = `${bal.toFixed(8)} ${this.currentSide === 'buy' ? quote : base}`;
    }
  }

  calculateFromSlider() {
    if (this.sliderPercent === 0) return;

    const [base, quote] = this.currentPair.split('/');
    const priceInput = document.getElementById('order-price');
    const amountInput = document.getElementById('order-amount');
    const totalInput = document.getElementById('order-total');

    const price = parseFloat(priceInput?.value) || this.currentPrice;
    const availableBalance = this.balance;

    if (this.currentSide === 'buy') {
      const total = availableBalance * (this.sliderPercent / 100);
      if (totalInput) totalInput.value = total.toFixed(2);
      if (price > 0 && amountInput) {
        amountInput.value = (total / price).toFixed(8);
      }
    } else {
      const amount = availableBalance * (this.sliderPercent / 100);
      if (amountInput) amountInput.value = amount.toFixed(8);
      if (price > 0 && totalInput) {
        totalInput.value = (amount * price).toFixed(2);
      }
    }
  }

  calculateTotal() {
    const priceInput = document.getElementById('order-price');
    const amountInput = document.getElementById('order-amount');
    const totalInput = document.getElementById('order-total');

    const price = parseFloat(priceInput?.value) || 0;
    const amount = parseFloat(amountInput?.value) || 0;

    if (price > 0 && amount > 0 && totalInput) {
      totalInput.value = (price * amount).toFixed(2);
    }
  }

  calculateAmount() {
    const priceInput = document.getElementById('order-price');
    const amountInput = document.getElementById('order-amount');
    const totalInput = document.getElementById('order-total');

    const price = parseFloat(priceInput?.value) || 0;
    const total = parseFloat(totalInput?.value) || 0;

    if (price > 0 && total > 0 && amountInput) {
      amountInput.value = (total / price).toFixed(8);
    }
  }

  setPrice(price) {
    const priceInput = document.getElementById('order-price');
    if (priceInput) {
      priceInput.value = price;
      this.currentPrice = price;
      this.calculateTotal();
    }
  }

  setPair(pair) {
    this.currentPair = pair;
    this.currentPrice = 0;
    this.sliderPercent = 0;
    document.querySelectorAll('.orderform-slider button').forEach(b => b.classList.remove('active'));

    const priceInput = document.getElementById('order-price');
    const amountInput = document.getElementById('order-amount');
    const totalInput = document.getElementById('order-total');
    const stopPriceInput = document.getElementById('order-stop-price');

    if (priceInput) priceInput.value = '';
    if (amountInput) amountInput.value = '';
    if (totalInput) totalInput.value = '';
    if (stopPriceInput) stopPriceInput.value = '';

    this.updateUI();

    this.fetchPriceDirectly();
  }

  async submitOrder() {
    const priceInput = document.getElementById('order-price');
    const amountInput = document.getElementById('order-amount');
    const stopPriceInput = document.getElementById('order-stop-price');

    const amount = parseFloat(amountInput?.value);
    if (!amount || amount <= 0) {
      this.showToast('Ingresa una cantidad válida', 'error');
      return;
    }

    const orderData = {
      pair: this.currentPair,
      side: this.currentSide,
      type: this.currentType,
      amount,
    };

    if (this.currentType === 'limit' || this.currentType === 'stop_limit') {
      const price = parseFloat(priceInput?.value);
      if (!price || price <= 0) {
        this.showToast('Ingresa un precio válido', 'error');
        return;
      }
      orderData.price = price;
    }

    if (this.currentType === 'stop_limit') {
      const stopPrice = parseFloat(stopPriceInput?.value);
      if (!stopPrice || stopPrice <= 0) {
        this.showToast('Ingresa un stop price válido', 'error');
        return;
      }
      orderData.stopPrice = stopPrice;
    }

    const submitBtn = document.getElementById('order-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
    }

    try {
      const result = await API.createOrder(orderData);
      console.log('[OrderForm] Order created:', result);

      const sideLabel = result.side === 'buy' ? 'Compra' : 'Venta';
      const exchangeLabel = result.exchangeOrderId ? ` (Binance: ${result.exchangeOrderId})` : '';
      this.showToast(`${sideLabel} ${result.amount} ${result.pair} @ ${result.price}${exchangeLabel}`, 'success');

      if (amountInput) amountInput.value = '';
      const totalInput = document.getElementById('order-total');
      if (totalInput) totalInput.value = '';
      document.querySelectorAll('.orderform-slider button').forEach(b => b.classList.remove('active'));
      this.sliderPercent = 0;

      if (window.loadOpenOrders) window.loadOpenOrders();
      if (window.refreshBalances) window.refreshBalances();
    } catch (error) {
      this.showToast('Error: ' + error.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        const baseCurrency = this.currentPair.split('/')[0];
        submitBtn.textContent = this.currentSide === 'buy'
          ? `Compra ${baseCurrency}`
          : `Vender ${baseCurrency}`;
      }
    }
  }
}
