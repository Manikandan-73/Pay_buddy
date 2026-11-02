/**
 * Add Money Page Controller
 */

import { apiRequest } from './api.js';
import { requireAuth } from './auth.js';
import { showToast, generateUUID } from './utils.js';

requireAuth();

const amountInput = document.getElementById('topup-amount');
const btnTopup = document.getElementById('btn-topup');
const optionCards = document.querySelectorAll('.payment-option-card');

let selectedMethod = 'SIMULATED_UPI';

// Selection handling
optionCards.forEach(card => {
  card.addEventListener('click', () => {
    optionCards.forEach(c => {
      c.classList.remove('selected');
      c.querySelector('input').checked = false;
    });
    card.classList.add('selected');
    card.querySelector('input').checked = true;
    selectedMethod = card.dataset.method;
  });
});

// Amount quick chips
document.querySelectorAll('.amount-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const chipVal = parseFloat(chip.dataset.amount);
    const currentVal = parseFloat(amountInput.value) || 0;
    amountInput.value = currentVal + chipVal;
  });
});

btnTopup.addEventListener('click', async () => {
  const amount = parseFloat(amountInput.value);

  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount greater than ₹0.00', 'error');
    return;
  }

  btnTopup.disabled = true;
  btnTopup.classList.add('btn-loading');

  const simulateFailure = selectedMethod === 'SIMULATE_FAILURE';
  const idempotencyKey = generateUUID();

  try {
    const res = await apiRequest('/wallets/fund', {
      method: 'POST',
      headers: {
        'x-idempotency-key': idempotencyKey
      },
      body: JSON.stringify({
        amount: amount.toFixed(2),
        paymentMethod: selectedMethod,
        simulateFailure
      })
    });

    showToast(`Successfully added ₹${amount.toFixed(2)} to wallet!`, 'success');

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 800);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnTopup.disabled = false;
    btnTopup.classList.remove('btn-loading');
  }
});
