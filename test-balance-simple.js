const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  console.log('=== TEST: Balance update after cancel ===\n');

  await page.goto('http://localhost:3000/trade.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(5000);

  console.log('1. Get initial balance:');
  const initialBalance = await page.locator('#user-balance').textContent();
  console.log('   Initial:', initialBalance);

  console.log('\n2. Create LIMIT SELL order (price much lower to avoid auto-fill):');
  await page.locator('#order-price').fill('30000');
  await page.locator('#order-amount').fill('0.0001');
  
  // Click SELL tab first
  await page.locator('.side-tab.sell').click();
  await page.waitForTimeout(500);
  
  await page.locator('#order-submit').click();
  await page.waitForTimeout(5000);

  const afterCreateBalance = await page.locator('#user-balance').textContent();
  console.log('   After create:', afterCreateBalance);

  console.log('\n3. Wait 6 seconds for balance refresh:');
  await page.waitForTimeout(6000);

  const finalBalance = await page.locator('#user-balance').textContent();
  console.log('   After delay:', finalBalance);

  console.log('\n4. Check if order exists and cancel:');
  const orderCount = await page.locator('.cancel-btn').count();
  console.log('   Cancel buttons:', orderCount);

  if (orderCount > 0) {
    await page.locator('.cancel-btn').first().click();
    await page.waitForTimeout(6000);
    
    const afterCancel = await page.locator('#user-balance').textContent();
    console.log('   After cancel:', afterCancel);
  }

  console.log('\n=== RESULT ===');
  if (initialBalance !== afterCreateBalance) {
    console.log('✅ Balance changed after order creation');
  } else {
    console.log('❌ Balance did NOT change after order creation');
  }

  await browser.close();
})();