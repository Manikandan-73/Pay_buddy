/**
 * PayBuddy Premium Add Money Controller
 */

import { apiRequest } from './api.js';
import { requireAuth } from './auth.js';
import { showToast, generateUUID } from './utils.js';

requireAuth();

const currentBalanceDisplay = document.getElementById('current-balance-display');
const amountInput = document.getElementById('topup-amount');
const btnTopup = document.getElementById('btn-topup');
const optionCards = document.querySelectorAll('.payment-option-card');

const formContainer = document.getElementById('topup-form-container');
const receiptContainer = document.getElementById('topup-receipt-container');
const successAmount = document.getElementById('success-topup-amount');
const successRef = document.getElementById('success-topup-ref');

let selectedMethod = 'SIMULATED_UPI';

// Load initial balance
async function loadBalance() {
  try {
    const res = await apiRequest('/auth/me');
    if (res.data?.primaryWallet) {
      const bal = parseFloat(res.data.primaryWallet.balance);
      currentBalanceDisplay.textContent = `Available: ₹ ${bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
  } catch (err) {
    currentBalanceDisplay.textContent = 'Available: ₹ 0.00';
  }
}

// Payment channel selection handling
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

    const tx = res.data?.transaction || {};

    // Switch to animated receipt screen
    formContainer.style.display = 'none';
    successAmount.textContent = `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    successRef.textContent = tx.reference || `UTR-FUND-${Date.now().toString().slice(-6)}`;
    receiptContainer.style.display = 'block';

    showToast(`Successfully added ₹${amount.toFixed(2)} to wallet!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnTopup.disabled = false;
    btnTopup.classList.remove('btn-loading');
  }
});

loadBalance();
