const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();

  console.log('=== TEST: UI Balance Update After Cancel ===\n');

  await page.goto('http://localhost:3000/trade.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(5000);

  const balance1 = await page.locator('#user-balance').textContent();
  console.log('1. Balance inicial en UI:', balance1);

  console.log('\n2. Crear orden BUY (0.0001 BTC @ 60000 = $6)');
  await page.locator('#order-price').fill('60000');
  await page.locator('#order-amount').fill('0.0001');
  await page.locator('#order-submit').click();
  await page.waitForTimeout(5000);

  const balance2 = await page.locator('#user-balance').textContent();
  console.log('   Balance en UI después de crear:', balance2);

  console.log('\n3. Ver si hay órdenes para cancelar');
  const cancelBtns = await page.locator('.cancel-btn').count();
  console.log('   Botones de cancelar:', cancelBtns);

  if (cancelBtns > 0) {
    console.log('\n4. Cancelar orden');
    await page.locator('.cancel-btn').first().click();
    await page.waitForTimeout(7000);

    const balance3 = await page.locator('#user-balance').textContent();
    console.log('   Balance en UI 7s después de cancelar:', balance3);
  }

  console.log('\n=== RESULTADO ===');
  console.log('Inicial:', balance1);
  console.log('Después de crear:', balance2);
  if (cancelBtns > 0) {
    console.log('Después de cancelar:', balance3);
  }

  await browser.close();
})();