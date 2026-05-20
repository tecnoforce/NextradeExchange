const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  console.log('=== TEST: Verificar actualización de balances después de cancelar ===\n');

  await page.goto('http://localhost:3000/trade.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(5000);

  const balanceBefore = await page.locator('#user-balance').textContent();
  console.log('1. Balance antes de crear orden:', balanceBefore);

  console.log('\n2. Crear orden...');
  const priceInput = await page.locator('#order-price').inputValue();
  await page.locator('#order-amount').fill('0.0001');
  await page.locator('#order-submit').click();
  await page.waitForTimeout(5000);

  const balanceAfterCreate = await page.locator('#user-balance').textContent();
  console.log('   Balance después de crear:', balanceAfterCreate);

  console.log('\n3. Cancelar orden...');
  await page.locator('.cancel-btn').first().click();
  await page.waitForTimeout(2000);

  const balanceAfterCancel = await page.locator('#user-balance').textContent();
  console.log('   Balance después de cancelar (2s):', balanceAfterCancel);

  await page.waitForTimeout(2000);

  const balanceAfterDelay = await page.locator('#user-balance').textContent();
  console.log('   Balance después de delay (4s total):', balanceAfterDelay);

  console.log('\n=== RESULTADO ===');
  if (balanceAfterCancel !== balanceBefore || balanceAfterDelay !== balanceBefore) {
    console.log('✅ Balance SÍ se actualiza después de cancelar');
  } else {
    console.log('❌ Balance NO se actualizó (mismo valor que al inicio)');
  }

  await browser.close();
})();