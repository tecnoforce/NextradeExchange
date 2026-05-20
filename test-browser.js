const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(msg.text());
    if (msg.type() === 'error') {
      console.log('[BROWSER ERROR]:', msg.text());
    }
  });

  console.log('=== Opening NexTrade ===');
  await page.goto('http://localhost:3000/trade.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('Page loaded');

  await page.waitForTimeout(3000);

  // Check header price
  const priceEl = await page.$('#header-price');
  const initialPrice = priceEl ? await priceEl.textContent() : 'NOT FOUND';
  console.log('Initial price:', initialPrice);

  // Check market list
  const marketRows = await page.$$('.market-row');
  console.log('Market rows found:', marketRows.length);

  // Check order book
  const orderbookContent = await page.$('#orderbook-content');
  const obText = orderbookContent ? await orderbookContent.textContent() : 'NOT FOUND';
  console.log('Orderbook content length:', obText.length);
  console.log('Orderbook preview:', obText.substring(0, 200));

  // Check recent trades
  const tradesContent = await page.$('#recent-trades');
  const tradesText = tradesContent ? await tradesContent.textContent() : 'NOT FOUND';
  console.log('Recent trades content length:', tradesText.length);

  // Wait and check if price updates
  console.log('\n=== Waiting 10 seconds to check price updates ===');
  await page.waitForTimeout(10000);

  const priceEl2 = await page.$('#header-price');
  const updatedPrice = priceEl2 ? await priceEl2.textContent() : 'NOT FOUND';
  console.log('Price after 10s:', updatedPrice);

  // Check if Socket.io connected
  const socketConnected = consoleMessages.some(m => m.includes('[Socket] Connected'));
  console.log('Socket.io connected (from console):', socketConnected);

  // Check for any JS errors
  const errors = consoleMessages.filter(m => m.includes('Error') || m.includes('error') || m.includes('failed'));
  console.log('\n=== Console Errors ===');
  if (errors.length > 0) {
    errors.forEach(e => console.log('  ', e));
  } else {
    console.log('  No errors found');
  }

  // Check network requests
  console.log('\n=== Summary ===');
  console.log('Initial price:', initialPrice);
  console.log('Updated price:', updatedPrice);
  console.log('Price changed:', initialPrice !== updatedPrice);
  console.log('Market rows:', marketRows.length);
  console.log('Orderbook has content:', obText.length > 50);
  console.log('Trades has content:', tradesText.length > 50);
  console.log('Socket connected:', socketConnected);

  await browser.close();
})();
