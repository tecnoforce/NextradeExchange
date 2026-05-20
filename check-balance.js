const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  console.log('=== Opening Wallet Page ===');
  await page.goto('http://localhost:3000/wallet.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  // Get total balance
  try {
    const totalEl = await page.locator('#total-balance').textContent();
    console.log('Total Balance:', totalEl);
  } catch (e) {
    console.log('Total balance element not found');
  }

  // Get all balance rows
  const rows = await page.locator('#balances-body tr').all();
  console.log('\n=== Balance Rows ===');
  for (const row of rows) {
    const cells = await row.locator('td').all();
    const currency = cells[0] ? await cells[0].textContent() : '';
    const total = cells[1] ? await cells[1].textContent() : '';
    const available = cells[2] ? await cells[2].textContent() : '';
    console.log(currency.trim(), '- Total:', total.trim(), '- Available:', available.trim());
  }

  // Also check the header balance on trade page
  console.log('\n=== Trade Page Header Balance ===');
  await page.goto('http://localhost:3000/trade.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  try {
    const balanceEl = await page.locator('#user-balance').textContent();
    console.log('Header balance:', balanceEl);
  } catch (e) {
    console.log('Header balance element not found');
  }

  // Check API response directly
  console.log('\n=== API /api/wallet/balances Response ===');
  const response = await page.evaluate(async () => {
    const res = await fetch('/api/wallet/balances');
    return res.json();
  });
  console.log(JSON.stringify(response, null, 2));

  await browser.close();
})();
