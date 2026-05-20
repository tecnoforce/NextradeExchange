const { chromium } = require('playwright');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('=== NexTrade Playwright Test ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`));

  // 1. Cargar página
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
  console.log('✓ Página cargada');
  await sleep(3000);

  // 2. Esperar a que el orderbook tenga datos
  let obRows = 0;
  for (let attempt = 0; attempt < 30; attempt++) {
    obRows = await page.evaluate(() => document.querySelectorAll('.orderbook-row').length);
    if (obRows > 0) break;
    await sleep(500);
  }
  console.log(`✓ Orderbook: ${obRows} filas`);
  if (obRows === 0) {
    console.log('✗ Orderbook vacío');
    await page.screenshot({ path: 'debug-empty.png' });
    await browser.close();
    return;
  }

  // 3. Obtener precios del DOM
  const prices = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.orderbook-row'))
      .map(r => parseFloat(r.dataset.price))
      .filter(p => !isNaN(p))
  );
  const mid = Math.floor(prices.length / 2);
  const buyPrice = prices[Math.floor(mid * 1.5)];
  const sellPrice = prices[Math.floor(mid * 0.5)];
  console.log(`Precios: buy@${buyPrice} sell@${sellPrice}`);

  // 4. Colocar órdenes
  const res1 = await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pair: 'BTC/USDT', side: 'buy', type: 'limit', price: String(buyPrice), amount: '0.01' }),
  });
  const buy = await res1.json();
  console.log(`✓ Orden compra: ${buy.status} @ ${buyPrice}`);

  const res2 = await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pair: 'BTC/USDT', side: 'sell', type: 'limit', price: String(sellPrice), amount: '0.01' }),
  });
  const sell = await res2.json();
  console.log(`✓ Orden venta: ${sell.status} @ ${sellPrice}`);

  // 5. Esperar el ciclo de actualización del orderbook (cada 3s en real mode)
  // y refrescar órdenes abiertas periódicamente
  let markersFound = false;
  for (let cycle = 0; cycle < 6; cycle++) {
    await sleep(3000);

    // Refrescar órdenes abiertas en la página
    await page.evaluate(() => {
      if (typeof loadOpenOrders === 'function') loadOpenOrders();
    });

    await sleep(1000);

    const state = await page.evaluate(() => ({
      markers: document.querySelectorAll('.order-marker').length,
      rows: document.querySelectorAll('.orderbook-row.has-order').length,
      rendererOrders: typeof openOrders !== 'undefined' ? openOrders.length : -1,
    }));
    console.log(`  ciclo ${cycle + 1}: markers=${state.markers} rows=${state.rows} openOrders=${state.rendererOrders}`);

    if (state.markers > 0) {
      markersFound = true;
      // Capturar el tooltip de los marcadores
      const titles = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.order-marker')).map(m => m.title)
      );
      console.log(`  Tooltips: ${titles.join(' | ')}`);
      break;
    }
  }

  // 6. Screenshot final
  await page.screenshot({ path: 'orderbook-test.png' });
  console.log('✓ Screenshot: orderbook-test.png');

  // 7. Resultado
  if (markersFound) {
    console.log('\n✅ TEST PASADO: Marcadores visibles en el orderbook');
  } else {
    console.log('\n❌ No se encontraron marcadores');
    const pricesNow = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.orderbook-row'))
        .map(r => parseFloat(r.dataset.price))
        .filter(p => !isNaN(p))
    );
    console.log(`Precis ahora: ${pricesNow.slice(0, 5)}...`);
    console.log(`Ordenes estaban en: buy=${buyPrice} sell=${sellPrice}`);
  }

  await browser.close();
})();
