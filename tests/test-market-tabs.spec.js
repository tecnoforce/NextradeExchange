const { test, expect } = require('@playwright/test');

test.describe('Market Tabs Test', () => {
  test('Pestañas filtran pares correctamente', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000/trade.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const countVisible = async () => (await page.locator('.market-row').all()).length;
    const getActiveTab = () => page.locator('.market-tab.active').textContent();

    // 1. Tab Todos (default)
    const tabText = await getActiveTab();
    console.log('1. Tab activa:', tabText);
    let count = await countVisible();
    console.log('   Pares visibles:', count);
    expect(count).toBeGreaterThanOrEqual(100);

    // 2. Click USDT tab → 40 pares
    await page.locator('.market-tab[data-quote="USDT"]').click();
    await page.waitForTimeout(500);
    console.log('2. Tab activa:', await getActiveTab());
    count = await countVisible();
    console.log('   Pares USDT:', count);
    expect(count).toBe(40);

    // 3. Click BTC tab → 30 pares
    await page.locator('.market-tab[data-quote="BTC"]').click();
    await page.waitForTimeout(500);
    console.log('3. Tab activa:', await getActiveTab());
    count = await countVisible();
    console.log('   Pares BTC:', count);
    expect(count).toBe(30);

    // 4. Click ETH tab → 15 pares
    await page.locator('.market-tab[data-quote="ETH"]').click();
    await page.waitForTimeout(500);
    console.log('4. Tab activa:', await getActiveTab());
    count = await countVisible();
    console.log('   Pares ETH:', count);
    expect(count).toBe(15);

    // 5. Click BNB tab → 15 pares
    await page.locator('.market-tab[data-quote="BNB"]').click();
    await page.waitForTimeout(500);
    console.log('5. Tab activa:', await getActiveTab());
    count = await countVisible();
    console.log('   Pares BNB:', count);
    expect(count).toBe(15);

    // 6. Volver a Todos
    await page.locator('.market-tab[data-quote="all"]').click();
    await page.waitForTimeout(500);
    console.log('6. Tab activa:', await getActiveTab());
    count = await countVisible();
    console.log('   Pares totales:', count);
    expect(count).toBeGreaterThanOrEqual(100);

    // 7. Cambiar par desde tab filtrado
    await page.locator('.market-tab[data-quote="ETH"]').click();
    await page.waitForTimeout(500);
    const firstPair = await page.locator('.market-row').first().getAttribute('data-pair');
    console.log('7. Primer par ETH:', firstPair);
    expect(firstPair).toContain('/ETH');

    await page.locator('.market-row').first().click();
    await page.waitForTimeout(2000);
    const header = await page.locator('#header-pair').textContent();
    console.log('   Header tras click:', header);
    expect(header).toBe(firstPair);

    console.log('\n✅ TODOS LOS TESTS DE MARKET TABS PASARON');
  });
});
