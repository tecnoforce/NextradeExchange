const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();

  const consoleMsgs = [];
  page.on('console', msg => {
    consoleMsgs.push(msg.text());
    if (msg.type() === 'error') console.log('[ERROR]', msg.text());
  });

  console.log('=== Opening Trade Page ===');
  await page.goto('http://localhost:3000/trade.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(5000);

  console.log('Price:', await page.locator('#header-price').textContent());
  console.log('Balance:', await page.locator('#user-balance').textContent());

  console.log('\n=== Checking price auto-fill ===');
  const priceVal = await page.locator('#order-price').inputValue();
  console.log('Price input value:', priceVal);

  console.log('\n=== Creating order ===');
  await page.locator('#order-amount').fill('0.0001');
  await page.waitForTimeout(500);

  console.log('Clicking submit...');
  await page.locator('#order-submit').click();
  await page.waitForTimeout(5000);

  console.log('\n=== Checking console logs ===');
  const orderLogs = consoleMsgs.filter(m => m.includes('Order') || m.includes('order') || m.includes('created'));
  orderLogs.forEach(l => console.log('  ', l));

  console.log('\n=== Checking toast container ===');
  const toastContainer = await page.locator('#toast-container').count();
  console.log('Toast container exists:', toastContainer > 0);
  if (toastContainer > 0) {
    const toasts = await page.locator('#toast-container div').count();
    console.log('Toasts:', toasts);
    for (let i = 0; i < toasts; i++) {
      console.log('  Toast', i + 1, ':', await page.locator('#toast-container div').nth(i).textContent());
    }
  }

  console.log('\n=== Checking open orders ===');
  const openCount = await page.locator('#open-orders-count').textContent();
  console.log('Open count badge:', openCount);
  const rows = await page.locator('#open-orders-body tr').count();
  console.log('Table rows:', rows);
  if (rows > 0) {
    const firstRow = await page.locator('#open-orders-body tr').first().textContent();
    console.log('First row:', firstRow.substring(0, 150));
  }

  console.log('\n=== Checking API directly ===');
  const apiResult = await page.evaluate(async () => {
    const res = await fetch('/api/orders/open');
    return res.json();
  });
  console.log('API open orders:', apiResult.length);
  apiResult.forEach(o => console.log('  -', o.pair, o.side, o.type, '@', o.price, 'Exchange:', o.exchangeOrderId));

  await browser.close();
})();
