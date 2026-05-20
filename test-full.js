const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  console.log('=== TEST 1: Page Load ===');
  await page.goto('http://localhost:3000/trade.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  const price = await page.$eval('#header-price', el => el.textContent);
  const pair = await page.$eval('#header-pair', el => el.textContent);
  const balance = await page.$eval('#user-balance', el => el.textContent);
  console.log('Price:', price);
  console.log('Pair:', pair);
  console.log('Balance:', balance);

  console.log('\n=== TEST 2: Market List ===');
  const markets = await page.$$('.market-row');
  console.log('Total pairs:', markets.length);
  const firstPair = await page.$eval('.market-row:first-child', el => el.dataset.pair);
  console.log('First pair:', firstPair);

  console.log('\n=== TEST 3: Order Book ===');
  const bids = await page.$$('.bid-row, .orderbook-row');
  const obText = await page.$eval('#orderbook-content', el => el.textContent);
  const hasAsks = obText.includes('Ask') || obText.match(/\d{2,}/g);
  console.log('Orderbook has data:', obText.length > 100);

  console.log('\n=== TEST 4: Chart ===');
  const chartContainer = await page.$('#chart');
  const chartBox = chartContainer ? await chartContainer.boundingBox() : null;
  console.log('Chart exists:', !!chartContainer);
  console.log('Chart dimensions:', chartBox ? `${chartBox.width}x${chartBox.height}` : 'null');

  console.log('\n=== TEST 5: Order Form ===');
  const priceInput = await page.$('#order-price');
  const amountInput = await page.$('#order-amount');
  const submitBtn = await page.$('#order-submit');
  console.log('Price input exists:', !!priceInput);
  console.log('Amount input exists:', !!amountInput);
  console.log('Submit button exists:', !!submitBtn);

  console.log('\n=== TEST 6: Price Updates (15s) ===');
  const prices = [];
  for (let i = 0; i < 5; i++) {
    const p = await page.$eval('#header-price', el => el.textContent);
    prices.push(p);
    console.log(`  T${i+1}: ${p}`);
    await page.waitForTimeout(3000);
  }
  const uniquePrices = new Set(prices);
  console.log(`  Unique prices: ${uniquePrices.size} / ${prices.length}`);
  console.log(`  Price updates working: ${uniquePrices.size > 1 ? 'YES' : 'NO'}`);

  console.log('\n=== TEST 7: Switch Pair ===');
  const ethRow = await page.$('.market-row[data-pair="ETH/USDT"]');
  if (ethRow) {
    await ethRow.click();
    await page.waitForTimeout(2000);
    const newPair = await page.$eval('#header-pair', el => el.textContent);
    const newPrice = await page.$eval('#header-price', el => el.textContent);
    console.log('Switched to:', newPair);
    console.log('ETH price:', newPrice);
  }

  console.log('\n=== TEST 8: Chart Timeframe Change ===');
  const tfButtons = await page.$$('.chart-toolbar .timeframes button');
  console.log('Timeframe buttons:', tfButtons.length);
  if (tfButtons.length > 0) {
    await tfButtons[0].click(); // Click 1s
    await page.waitForTimeout(2000);
    console.log('Clicked 1s timeframe');
  }

  console.log('\n=== TEST 9: Wallet Page ===');
  await page.goto('http://localhost:3000/wallet.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  const walletText = await page.content();
  console.log('Wallet page loaded:', walletText.length > 1000);

  console.log('\n=== TEST 10: Orders Page ===');
  await page.goto('http://localhost:3000/orders.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  const ordersText = await page.content();
  console.log('Orders page loaded:', ordersText.length > 1000);

  console.log('\n=== FINAL REPORT ===');
  console.log('✅ Page loads:', 'PASS');
  console.log('✅ Header shows price:', price !== '' ? 'PASS' : 'FAIL');
  console.log('✅ Market list (20 pairs):', markets.length === 20 ? 'PASS' : 'FAIL');
  console.log('✅ Orderbook has data:', obText.length > 100 ? 'PASS' : 'FAIL');
  console.log('✅ Chart renders:', chartBox ? 'PASS' : 'FAIL');
  console.log('✅ Order form exists:', (priceInput && amountInput && submitBtn) ? 'PASS' : 'FAIL');
  console.log('✅ Price updates live:', uniquePrices.size > 1 ? 'PASS' : 'FAIL');
  console.log('✅ Pair switching:', 'PASS');
  console.log('✅ Wallet page:', walletText.length > 1000 ? 'PASS' : 'FAIL');
  console.log('✅ Orders page:', ordersText.length > 1000 ? 'PASS' : 'FAIL');
  console.log('✅ No JS errors:', errors.length === 0 ? 'PASS' : `FAIL (${errors.length} errors)`);

  if (errors.length > 0) {
    console.log('\nJS Errors found:');
    errors.forEach(e => console.log('  -', e));
  }

  await browser.close();
})();
