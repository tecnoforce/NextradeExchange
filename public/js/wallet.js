let userBalances = {};

function formatAmount(amount) {
  if (amount >= 1) return amount.toFixed(4);
  return amount.toFixed(8);
}

function formatValue(value) {
  if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(2) + 'K';
  return value.toFixed(2);
}

async function refreshWalletBalances() {
  try {
    const balances = await API.getBalances();
    userBalances = {};
    balances.forEach(b => {
      userBalances[b.currency] = b.total;
    });

    try {
      window.allTickers = await API.getAllTickers();
    } catch (e) {
      console.warn('[Wallet] Could not fetch tickers:', e.message);
    }

    const totalUSDT = calculateTotalUSDT();
    document.getElementById('total-balance').textContent = `$${formatValue(totalUSDT)}`;
    renderBalances();
  } catch (error) {
    console.error('[Wallet] Failed to refresh:', error);
  }
}

async function init() {
  socketManager.connect();

  socketManager.on('balance:update', async () => {
    await refreshWalletBalances();
  });

  socketManager.on('ticker:update', (data) => {
    if (data.pair) {
      if (!window.allTickers) window.allTickers = {};
      window.allTickers[data.pair] = data;
      const totalUSDT = calculateTotalUSDT();
      document.getElementById('total-balance').textContent = `$${formatValue(totalUSDT)}`;
    }
  });

  socketManager.subscribeAll();

  await refreshWalletBalances();

  document.getElementById('deposit-btn')?.addEventListener('click', () => showModal('deposit'));
  document.getElementById('withdraw-btn')?.addEventListener('click', () => showModal('withdraw'));

  document.getElementById('modal-cancel')?.addEventListener('click', hideModal);
  document.getElementById('modal-overlay')?.addEventListener('click', hideModal);

  document.getElementById('modal-confirm')?.addEventListener('click', handleModalSubmit);
}

function calculateTotalUSDT() {
  let total = 0;
  const tickerPrices = {};

  if (window.allTickers) {
    Object.entries(window.allTickers).forEach(([pair, ticker]) => {
      const base = pair.split('/')[0];
      tickerPrices[base] = ticker.price;
    });
  }

  Object.entries(userBalances).forEach(([currency, amount]) => {
    if (currency === 'USDT') {
      total += amount;
    } else if (currency === 'USDC') {
      total += amount;
    } else {
      const pair = `${currency}/USDT`;
      const price = tickerPrices[currency] || (window.allTickers && window.allTickers[pair] ? window.allTickers[pair].price : 0);
      total += amount * price;
    }
  });

  return total;
}

function renderBalances() {
  const container = document.getElementById('balances-body');
  if (!container) return;

  let html = '';
  Object.entries(userBalances).forEach(([currency, amount]) => {
    if (amount <= 0) return;
    html += `<tr>
      <td><strong>${currency}</strong></td>
      <td>${formatAmount(amount)}</td>
      <td>${formatAmount(amount)}</td>
      <td>0</td>
      <td>
        <button class="action-btn deposit" onclick="showModal('deposit', '${currency}')">Depositar</button>
        <button class="action-btn withdraw" onclick="showModal('withdraw', '${currency}')">Retirar</button>
      </td>
    </tr>`;
  });

  container.innerHTML = html;
}

function showModal(type, currency = 'USDT') {
  const modal = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const currencySelect = document.getElementById('modal-currency');
  const amountInput = document.getElementById('modal-amount');
  const addressGroup = document.getElementById('address-group');

  if (modal) modal.style.display = 'flex';
  if (title) title.textContent = type === 'deposit' ? 'Depositar' : 'Retirar';

  if (currencySelect) {
    currencySelect.innerHTML = '';
    Object.keys(userBalances).forEach(c => {
      const option = document.createElement('option');
      option.value = c;
      option.textContent = c;
      if (c === currency) option.selected = true;
      currencySelect.appendChild(option);
    });
  }

  if (addressGroup) {
    addressGroup.style.display = type === 'withdraw' ? 'block' : 'none';
  }

  if (amountInput) amountInput.value = '';
}

function hideModal() {
  const modal = document.getElementById('modal-overlay');
  if (modal) modal.style.display = 'none';
}

async function handleModalSubmit() {
  const type = document.getElementById('modal-title').textContent === 'Depositar' ? 'deposit' : 'withdraw';
  const currency = document.getElementById('modal-currency').value;
  const amount = document.getElementById('modal-amount').value;
  const address = document.getElementById('modal-address')?.value;

  if (!amount || parseFloat(amount) <= 0) {
    alert('Ingresa una cantidad válida');
    return;
  }

  try {
    if (type === 'deposit') {
      await API.deposit(currency, amount);
    } else {
      if (!address) {
        alert('Ingresa una dirección');
        return;
      }
      await API.withdraw(currency, amount, address);
    }

    hideModal();
    const balances = await API.getBalances();
    userBalances = {};
    balances.forEach(b => {
      userBalances[b.currency] = b.total;
    });
    document.getElementById('total-balance').textContent = `$${formatValue(calculateTotalUSDT())}`;
    renderBalances();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

document.addEventListener('DOMContentLoaded', init);