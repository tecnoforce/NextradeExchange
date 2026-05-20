// @ts-check
const { test, expect } = require('@playwright/test');

const sleep = ms => new Promise(r => setTimeout(r, ms));

test.describe('NexTrade E2E Tests', () => {

  test('page loads and orderbook has data', async ({ page }) => {
    console.log('=== NexTrade Playwright Test ===\n');

    // 1. Load page
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('✓ Page loaded');
    await sleep(3000);

    // 2. Wait for orderbook to have data
    let obRows = 0;
    for (let attempt = 0; attempt < 30; attempt++) {
      obRows = await page.locator('.orderbook-row').count();
      if (obRows > 0) break;
      await sleep(500);
    }
    console.log(`✓ Orderbook: ${obRows} rows`);
    expect(obRows).toBeGreaterThan(0);

    if (obRows === 0) {
      await page.screenshot({ path: 'test-results/debug-empty.png' });
      test.fail('Orderbook is empty');
      return;
    }

    // 3. Get prices from DOM
    const prices = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.orderbook-row'))
        .map(r => parseFloat(r.dataset.price))
        .filter(p => !isNaN(p))
    );
    const mid = Math.floor(prices.length / 2);
    const buyPrice = prices[Math.floor(mid * 1.5)] || prices[mid - 1];
    const sellPrice = prices[Math.floor(mid * 0.5)] || prices[mid + 1];
    console.log(`Prices: buy@${buyPrice} sell@${sellPrice}`);

    // 4. Place orders via page.evaluate (fetch inside browser context)
    const buyResult = await page.evaluate(async ({ pair, side, type, price, amount }) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair, side, type, price: String(price), amount: String(amount) }),
      });
      return res.json();
    }, { pair: 'BTC/USDT', side: 'buy', type: 'limit', price: buyPrice, amount: '0.01' });
    console.log(`✓ Buy order: ${buyResult.status} @ ${buyPrice}`);

    const sellResult = await page.evaluate(async ({ pair, side, type, price, amount }) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair, side, type, price: String(price), amount: String(amount) }),
      });
      return res.json();
    }, { pair: 'BTC/USDT', side: 'sell', type: 'limit', price: sellPrice, amount: '0.01' });
    console.log(`✓ Sell order: ${sellResult.status} @ ${sellPrice}`);

    // 5. Wait for orderbook refresh cycle and check markers
    let markersFound = false;
    for (let cycle = 0; cycle < 6; cycle++) {
      await sleep(3000);

      // Refresh open orders on the page
      await page.evaluate(() => {
        if (typeof loadOpenOrders === 'function') loadOpenOrders();
      });

      await sleep(1000);

      const state = await page.evaluate(() => ({
        markers: document.querySelectorAll('.order-marker').length,
        rows: document.querySelectorAll('.orderbook-row.has-order').length,
        rendererOrders: typeof openOrders !== 'undefined' ? openOrders.length : -1,
      }));
      console.log(`  cycle ${cycle + 1}: markers=${state.markers} rows=${state.rows} openOrders=${state.rendererOrders}`);

      if (state.markers > 0) {
        markersFound = true;
        const titles = await page.evaluate(() =>
          Array.from(document.querySelectorAll('.order-marker')).map(m => m.title)
        );
        console.log(`  Tooltips: ${titles.join(' | ')}`);
        break;
      }
    }

    // 6. Final screenshot
    await page.screenshot({ path: 'test-results/orderbook-test.png' });
    console.log('✓ Screenshot: orderbook-test.png');

    // 7. Result
    expect(markersFound).toBe(true);
    if (markersFound) {
      console.log('\n✅ TEST PASSED: Markers visible in orderbook');
    } else {
      console.log('\n❌ No markers found');
    }
  });

  test('wallet page shows balances', async ({ page }) => {
    await page.goto('http://localhost:3000/wallet.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(2000);

    const balanceRows = await page.locator('.balance-row, .wallet-row, tr').count();
    console.log(`Wallet rows: ${balanceRows}`);
    expect(balanceRows).toBeGreaterThan(0);
  });

  test('orders page loads', async ({ page }) => {
    await page.goto('http://localhost:3000/orders.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(2000);

    const title = await page.title();
    console.log(`Orders page title: ${title}`);
    expect(title).toBeTruthy();
  });
});
