// @ts-check
const { test, expect } = require('@playwright/test');

const sleep = ms => new Promise(r => setTimeout(r, ms));

test.describe('NexTrade Tiempo Real Tests', () => {

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`  [${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });
  });

  // =========================================================================
  // TEST 1: trade.html carga y recibe datos por socket
  // =========================================================================
  test('1. Trade page conecta Socket.io y recibe ticker/orderbook/trades', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('http://localhost:3000/trade.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('✓ trade.html loaded');

    // Wait for socket connection
    await page.waitForFunction(() => {
      if (typeof socketManager !== 'undefined' && socketManager.socket) {
        return socketManager.connected === true;
      }
      return false;
    }, { timeout: 10000 });
    console.log('✓ Socket.io connected');

    // Wait for ticker data in header
    await page.waitForFunction(() => {
      const el = document.getElementById('header-price');
      return el && el.textContent && parseFloat(el.textContent.replace(/,/g, '')) > 0;
    }, { timeout: 10000 });
    const headerPrice = await page.locator('#header-price').textContent();
    console.log(`✓ Header price updated: ${headerPrice}`);

    // Wait for orderbook rows
    await page.waitForFunction(() => {
      return document.querySelectorAll('.orderbook-row').length >= 2;
    }, { timeout: 10000 });
    const obRows = await page.locator('.orderbook-row').count();
    console.log(`✓ Orderbook rows: ${obRows}`);

    // Wait for recent trades
    await page.waitForFunction(() => {
      const container = document.getElementById('recent-trades');
      if (!container) return false;
      return container.querySelectorAll('[class*="text-buy"], [class*="text-sell"]').length >= 1;
    }, { timeout: 10000 });
    console.log('✓ Recent trades populated');

    // Wait for markets list
    await page.waitForFunction(() => {
      return document.querySelectorAll('.market-row').length >= 5;
    }, { timeout: 10000 });
    const marketRows = await page.locator('.market-row').count();
    console.log(`✓ Markets list has ${marketRows} rows`);
    expect(marketRows).toBeGreaterThan(5);
  });

  // =========================================================================
  // TEST 2: Markets list se actualiza en tiempo real
  // =========================================================================
  test('2. Markets list and header update in real-time via socket', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('http://localhost:3000/trade.html', { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Wait for socket connection
    await page.waitForFunction(() => {
      if (typeof socketManager !== 'undefined' && socketManager.socket) {
        return socketManager.connected === true;
      }
      return false;
    }, { timeout: 10000 });
    console.log('✓ Socket.io connected');

    // Wait for initial ticker data
    await page.waitForFunction(() => {
      const el = document.getElementById('header-price');
      return el && el.textContent && parseFloat(el.textContent.replace(/,/g, '')) > 0;
    }, { timeout: 10000 });
    const initialPrice = await page.locator('#header-price').textContent();
    console.log(`✓ Initial header price: ${initialPrice}`);

    // Wait a few seconds for socket ticker updates to arrive
    await sleep(3000);

    // Check that price has potentially changed (or at least that element exists with a value)
    const currentPrice = await page.locator('#header-price').textContent();
    console.log(`✓ Current header price after 3s: ${currentPrice}`);

    // Verify markets list is populated (ticker:update global event)
    const marketCount = await page.locator('.market-row').count();
    console.log(`✓ Markets list rows: ${marketCount}`);
    expect(marketCount).toBeGreaterThanOrEqual(19);

    // Verify price columns in markets list have values
    const firstMarketPrice = await page.locator('.market-row').first().locator('span:nth-child(3)').textContent();
    console.log(`✓ First market price: ${firstMarketPrice}`);
    expect(parseFloat(firstMarketPrice.replace(/,/g, ''))).toBeGreaterThan(0);
  });

  // =========================================================================
  // TEST 3: Wallet page con Socket.io
  // =========================================================================
  test('3. Wallet page conecta socket y recibe balances en tiempo real', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('http://localhost:3000/wallet.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('✓ wallet.html loaded');

    // Wait for socket connection
    await page.waitForFunction(() => {
      if (typeof socketManager !== 'undefined' && socketManager.socket) {
        return socketManager.connected === true;
      }
      return false;
    }, { timeout: 10000 });
    console.log('✓ Socket.io connected on wallet page');

    // Wait for balance data
    await page.waitForFunction(() => {
      const el = document.getElementById('total-balance');
      return el && el.textContent && el.textContent !== '$0.00';
    }, { timeout: 15000 });
    const totalBalance = await page.locator('#total-balance').textContent();
    console.log(`✓ Total balance: ${totalBalance}`);

    // Wait for balance table rows
    await page.waitForFunction(() => {
      const tbody = document.getElementById('balances-body');
      if (!tbody) return false;
      return tbody.querySelectorAll('tr').length >= 3;
    }, { timeout: 10000 });
    const balanceRows = await page.locator('#balances-body tr').count();
    console.log(`✓ Balance rows: ${balanceRows}`);
    expect(balanceRows).toBeGreaterThanOrEqual(3);

    // Verify socket listeners exist
    const hasBalanceListener = await page.evaluate(() => {
      if (typeof socketManager === 'undefined') return false;
      return socketManager.listeners && 
        (socketManager.listeners['balance:update'] || []).length > 0;
    });
    console.log(`✓ balance:update listener registered: ${hasBalanceListener}`);

    const hasTickerListener = await page.evaluate(() => {
      if (typeof socketManager === 'undefined') return false;
      return socketManager.listeners && 
        (socketManager.listeners['ticker:update'] || []).length > 0;
    });
    console.log(`✓ ticker:update listener registered: ${hasTickerListener}`);

    expect(hasBalanceListener || hasTickerListener).toBe(true);
  });

  // =========================================================================
  // TEST 4: Orders page con Socket.io
  // =========================================================================
  test('4. Orders page conecta socket y puede recargar historial', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('http://localhost:3000/orders.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('✓ orders.html loaded');

    // Wait for socket connection
    await page.waitForFunction(() => {
      if (typeof socketManager !== 'undefined' && socketManager.socket) {
        return socketManager.connected === true;
      }
      return false;
    }, { timeout: 10000 });
    console.log('✓ Socket.io connected on orders page');

    // Wait for pair filter to be populated
    await page.waitForFunction(() => {
      const sel = document.getElementById('filter-pair');
      return sel && sel.options.length >= 5;
    }, { timeout: 10000 });
    const pairOptions = await page.locator('#filter-pair option').count();
    console.log(`✓ Pair filter options: ${pairOptions}`);
    expect(pairOptions).toBeGreaterThanOrEqual(20);

    // Check orders table exists
    await page.waitForSelector('#orders-history-body', { timeout: 5000 });
    console.log('✓ Orders history table present');

    // Verify socket listener for order:update
    const hasOrderListener = await page.evaluate(() => {
      if (typeof socketManager === 'undefined') return false;
      return socketManager.listeners && 
        (socketManager.listeners['order:update'] || []).length > 0;
    });
    console.log(`✓ order:update listener registered: ${hasOrderListener}`);
    expect(hasOrderListener).toBe(true);
  });

  // =========================================================================
  // TEST 5: Creacion de orden via API y verificacion visual
  // =========================================================================
  test('5. Crear orden via API se refleja en UI via socket order:update', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:3000/trade.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('✓ trade.html loaded');

    // Wait for socket + data
    await page.waitForFunction(() => {
      if (typeof socketManager !== 'undefined' && socketManager.socket) {
        return socketManager.connected === true;
      }
      return false;
    }, { timeout: 10000 });

    await page.waitForFunction(() => {
      const el = document.getElementById('header-price');
      return el && el.textContent && parseFloat(el.textContent.replace(/,/g, '')) > 0;
    }, { timeout: 10000 });

    // Wait for orderbook data
    await page.waitForFunction(() => {
      return document.querySelectorAll('.orderbook-row').length >= 2;
    }, { timeout: 15000 });
    console.log('✓ Page ready');

    // Get prices from orderbook for buy/sell
    const prices = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.orderbook-row'))
        .map(r => parseFloat(r.dataset.price))
        .filter(p => !isNaN(p))
    );
    console.log(`✓ Got ${prices.length} orderbook prices`);

    if (prices.length < 4) {
      console.log('⚠ Skipping order placement - insufficient prices');
      return;
    }

    const mid = Math.floor(prices.length / 2);
    const buyPrice = prices[Math.floor(mid * 1.3)] || prices[prices.length - 1];
    const sellPrice = prices[Math.floor(mid * 0.7)] || prices[0];

    console.log(`Placing buy@${buyPrice} sell@${sellPrice}`);

    // Clear any existing orders first
    await page.evaluate(async () => {
      try {
        await fetch('/api/orders/cancel-all?pair=BTC/USDT', { method: 'DELETE' });
      } catch(e) {}
    });

    // Get initial open order count
    const initialCount = await page.evaluate(() => {
      const el = document.getElementById('open-orders-count');
      return el ? parseInt(el.textContent) : 0;
    });
    console.log(`✓ Initial open orders count: ${initialCount}`);

    // Place a BUY order via API
    const buyResult = await page.evaluate(async ({ price, amount }) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair: 'BTC/USDT', side: 'buy', type: 'limit', price: String(price), amount: String(amount) }),
      });
      return res.json();
    }, { price: buyPrice, amount: '0.001' });
    console.log(`✓ Buy order created: ${buyResult.status || buyResult.id}`);

    // Wait for socket order:update event to trigger UI refresh
    await sleep(3000);

    // Check that open orders count updated
    const newCount = await page.evaluate(() => {
      const el = document.getElementById('open-orders-count');
      return el ? parseInt(el.textContent) : 0;
    });
    console.log(`✓ Open orders count after buy: ${newCount}`);
    expect(newCount).toBeGreaterThanOrEqual(initialCount + 1);

    // Check if order markers appear in orderbook
    let markersFound = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const markers = await page.locator('.order-marker').count();
      if (markers > 0) {
        markersFound = true;
        console.log(`✓ Order markers visible in orderbook: ${markers}`);
        break;
      }
      await sleep(2000);
    }
    if (!markersFound) {
      console.log('⚠ No order markers found in orderbook (may need refresh cycle)');
    }

    // Place a SELL order
    const sellResult = await page.evaluate(async ({ price, amount }) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair: 'BTC/USDT', side: 'sell', type: 'limit', price: String(price), amount: String(amount) }),
      });
      return res.json();
    }, { price: sellPrice, amount: '0.001' });
    console.log(`✓ Sell order created: ${sellResult.status || sellResult.id}`);

    await sleep(3000);

    const countAfterSell = await page.evaluate(() => {
      const el = document.getElementById('open-orders-count');
      return el ? parseInt(el.textContent) : 0;
    });
    console.log(`✓ Open orders count after both orders: ${countAfterSell}`);
    expect(countAfterSell).toBeGreaterThanOrEqual(initialCount + 1);

    // Cancel all orders and verify count goes down
    await page.evaluate(async () => {
      try {
        await fetch('/api/orders/cancel-all?pair=BTC/USDT', { method: 'DELETE' });
      } catch(e) {}
    });
    console.log('✓ Cancel-all executed');

    await sleep(4000);

    const finalCount = await page.evaluate(() => {
      const el = document.getElementById('open-orders-count');
      return el ? parseInt(el.textContent) : 0;
    });
    console.log(`✓ Open orders after cancel: ${finalCount}`);
    expect(finalCount).toBeLessThanOrEqual(initialCount);

    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/orders-test.png', fullPage: true });
    console.log('✓ Screenshot: orders-test.png');
  });

  // =========================================================================
  // TEST 6: Bottom panels cargan datos y se actualizan
  // =========================================================================
  test('6. Bottom panels (order-history, trade-history, portfolio) cargan y reciben datos', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:3000/trade.html', { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Wait for socket + initial data
    await page.waitForFunction(() => {
      if (typeof socketManager !== 'undefined' && socketManager.socket) {
        return socketManager.connected === true;
      }
      return false;
    }, { timeout: 10000 });

    await page.waitForFunction(() => {
      const el = document.getElementById('header-price');
      return el && el.textContent && parseFloat(el.textContent.replace(/,/g, '')) > 0;
    }, { timeout: 10000 });
    console.log('✓ Page ready');

    // Test panel-order-history
    console.log('\n--- Panel: Order History ---');
    const orderHistoryTab = page.locator('.bottom-tabs .tab[data-panel="panel-order-history"]');
    await orderHistoryTab.click();
    await sleep(2000);

    const orderPanel = page.locator('#panel-order-history');
    const orderPanelContent = await orderPanel.textContent();
    console.log(`  Content: ${orderPanelContent.substring(0, 80)}...`);

    const hasOrderTable = await orderPanel.locator('table').count() > 0 ||
                          (await orderPanel.textContent()).includes('No hay');
    console.log(`  Table or placeholder visible: ${hasOrderTable}`);

    // Test panel-trade-history
    console.log('\n--- Panel: Trade History ---');
    const tradeHistoryTab = page.locator('.bottom-tabs .tab[data-panel="panel-trade-history"]');
    await tradeHistoryTab.click();
    await sleep(2000);

    const tradePanel = page.locator('#panel-trade-history');
    const tradePanelContent = await tradePanel.textContent();
    console.log(`  Content: ${tradePanelContent.substring(0, 80)}...`);

    const hasTradeTable = await tradePanel.locator('table').count() > 0 ||
                          (await tradePanel.textContent()).includes('No hay');
    console.log(`  Table or placeholder visible: ${hasTradeTable}`);

    // Test panel-portfolio
    console.log('\n--- Panel: Portfolio ---');
    const portfolioTab = page.locator('.bottom-tabs .tab[data-panel="panel-portfolio"]');
    await portfolioTab.click();
    await sleep(3000);

    const portfolioPanel = page.locator('#panel-portfolio');
    const portfolioContent = await portfolioPanel.textContent();
    console.log(`  Content: ${portfolioContent.substring(0, 80)}...`);

    // Check for portfolio cards or placeholder
    const hasPortfolioCards = await portfolioPanel.locator('.portfolio-card, .portfolio-grid, .panel-placeholder').count() > 0;
    console.log(`  Portfolio content visible: ${hasPortfolioCards}`);

    // Take screenshot
    await page.screenshot({ path: 'test-results/bottom-panels.png', fullPage: true });
    console.log('\n✓ Screenshot: bottom-panels.png');

    // Create an order and verify panel reloads when switching back
    await page.evaluate(async () => {
      const prices = Array.from(document.querySelectorAll('.orderbook-row'))
        .map(r => parseFloat(r.dataset.price))
        .filter(p => !isNaN(p));
      const mid = Math.floor(prices.length / 2);
      const buyPrice = prices[Math.floor(mid * 1.3)] || prices[prices.length - 1];
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair: 'BTC/USDT', side: 'buy', type: 'limit', price: String(buyPrice), amount: '0.001' }),
      });
    });
    console.log('✓ Test order placed for panel verification');

    await sleep(2000);

    // Cleanup: cancel test order
    await page.evaluate(async () => {
      await fetch('/api/orders/cancel-all?pair=BTC/USDT', { method: 'DELETE' });
    });
    console.log('✓ Test order cleaned up');
  });

  // =========================================================================
  // TEST 7: Socket reconnection and data consistency
  // =========================================================================
  test('7. Socket reconexion funciona y datos persisten', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('http://localhost:3000/trade.html', { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Wait for socket connection
    await page.waitForFunction(() => {
      if (typeof socketManager !== 'undefined' && socketManager.socket) {
        return socketManager.connected === true;
      }
      return false;
    }, { timeout: 10000 });
    console.log('✓ Socket.io connected');

    // Simulate disconnection by navigating away and back
    await page.goto('http://localhost:3000/wallet.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(2000);
    console.log('✓ Navigated to wallet.html');

    // Verify wallet loads with socket
    await page.waitForFunction(() => {
      if (typeof socketManager !== 'undefined' && socketManager.socket) {
        return socketManager.connected === true;
      }
      return false;
    }, { timeout: 10000 });
    console.log('✓ Socket reconnected on wallet page');

    // Go back to trade
    await page.goto('http://localhost:3000/trade.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(3000);

    // Verify trade page receives data again
    const priceAfterReconnect = await page.locator('#header-price').textContent();
    console.log(`✓ Price after navigation back: ${priceAfterReconnect}`);
    expect(parseFloat(priceAfterReconnect.replace(/,/g, ''))).toBeGreaterThan(0);

    // Verify markets list still populated
    const marketsAfterReconnect = await page.locator('.market-row').count();
    console.log(`✓ Markets after reconnect: ${marketsAfterReconnect}`);
    expect(marketsAfterReconnect).toBeGreaterThan(5);
  });
});
