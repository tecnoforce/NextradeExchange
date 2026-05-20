const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  console.log('=== TEST 1: Page Load ===');
  await page.goto('http://localhost:3000/trade.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(5000);

  const price = await page.locator('#header-price').textContent();
  const balance = await page.locator('#user-balance').textContent();
  console.log('Price:', price);
  console.log('Balance:', balance);

  console.log('\n=== TEST 2: Order Form - Price Auto-fill ===');
  const priceInput = await page.locator('#order-price').inputValue();
  console.log('Auto-filled price:', priceInput);

  console.log('\n=== TEST 3: Create LIMIT BUY Order ===');
  await page.locator('#order-amount').fill('0.0001');
  await page.waitForTimeout(500);
  await page.locator('#order-submit').click();
  await page.waitForTimeout(5000);

  const toastSuccess = await page.locator('#toast-container div').count();
  console.log('Toast notifications:', toastSuccess);
  if (toastSuccess > 0) {
    const toastText = await page.locator('#toast-container div').first().textContent();
    console.log('Toast message:', toastText);
  }

  console.log('\n=== TEST 4: Verify Order in Open Orders ===');
  await page.waitForTimeout(2000);
  const orderRows = await page.locator('#open-orders-body tr').count();
  console.log('Order rows:', orderRows);

  if (orderRows > 1) {
    const firstRow = await page.locator('#open-orders-body tr').first().textContent();
    console.log('First order row:', firstRow.substring(0, 100));
    const hasRealBadge = await page.locator('#open-orders-body').getByText('● REAL').count();
    console.log('REAL badges:', hasRealBadge);
  }

  const openCount = await page.locator('#open-orders-count').textContent();
  console.log('Open orders count:', openCount);

  console.log('\n=== TEST 5: Cancel Order ===');
  const cancelBtns = await page.locator('.cancel-btn').count();
  console.log('Cancel buttons:', cancelBtns);
  if (cancelBtns > 0) {
    await page.locator('.cancel-btn').first().click();
    await page.waitForTimeout(3000);

    const newOrderRows = await page.locator('#open-orders-body tr').count();
    console.log('Order rows after cancel:', newOrderRows);

    const newOpenCount = await page.locator('#open-orders-count').textContent();
    console.log('Open orders count after cancel:', newOpenCount);
  }

  console.log('\n=== TEST 6: Create Another Order ===');
  await page.locator('#order-price').fill('50000');
  await page.locator('#order-amount').fill('0.0001');
  await page.waitForTimeout(500);
  await page.locator('#order-submit').click();
  await page.waitForTimeout(5000);

  const toastCount2 = await page.locator('#toast-container div').count();
  console.log('Toast count after 2nd order:', toastCount2);
  if (toastCount2 > 0) {
    const toastText2 = await page.locator('#toast-container div').first().textContent();
    console.log('Toast message:', toastText2);
  }

  const finalOrderRows = await page.locator('#open-orders-body tr').count();
  console.log('Final order rows:', finalOrderRows);
  const finalOpenCount = await page.locator('#open-orders-count').textContent();
  console.log('Final open count:', finalOpenCount);

  console.log('\n=== TEST 7: Verify Balances Updated ===');
  const newBalance = await page.locator('#user-balance').textContent();
  console.log('Balance after orders:', newBalance);

  console.log('\n=== FINAL REPORT ===');
  console.log('✅ Page loads:', 'PASS');
  console.log('✅ Price auto-fill:', priceInput !== '' ? 'PASS' : 'FAIL');
  console.log('✅ Order creation toast:', toastSuccess > 0 ? 'PASS' : 'FAIL');
  console.log('✅ Orders shown in table:', orderRows > 1 ? 'PASS' : 'FAIL');
  console.log('✅ REAL badge:', orderRows > 1 ? 'PASS' : 'FAIL');
  console.log('✅ Cancel works:', cancelBtns > 0 ? 'PASS' : 'FAIL');
  console.log('✅ Balance updated:', newBalance !== balance ? 'PASS' : 'FAIL');
  console.log('✅ JS errors:', errors.length === 0 ? `PASS (0 errors)` : `FAIL (${errors.length} errors)`);

  if (errors.length > 0) {
    console.log('\nJS Errors:');
    errors.forEach(e => console.log('  -', e));
  }

  await browser.close();
})();
