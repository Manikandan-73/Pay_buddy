/**
 * Send Money Page Controller
 */

import { apiRequest } from './api.js';
import { requireAuth } from './auth.js';
import { formatINR, generateUUID, showToast, formatTransactionDate } from './utils.js';

requireAuth();

let selectedRecipient = null;
let userWallet = null;

const inputQuery = document.getElementById('recipient-query');
const btnLookup = document.getElementById('btn-lookup');
const previewBox = document.getElementById('recipient-preview-box');
const recAvatar = document.getElementById('rec-avatar');
const recName = document.getElementById('rec-name');
const recMeta = document.getElementById('rec-meta');

const amountCard = document.getElementById('amount-card');
const amountInput = document.getElementById('transfer-amount');
const balanceHint = document.getElementById('available-balance-hint');
const btnSend = document.getElementById('btn-send-transfer');

const flowContainer = document.getElementById('transfer-flow-container');
const receiptContainer = document.getElementById('receipt-container');
const receiptAmount = document.getElementById('receipt-amount');
const receiptReceiverName = document.getElementById('receipt-receiver-name');
const receiptUtr = document.getElementById('receipt-utr');
const receiptTime = document.getElementById('receipt-time');

// Load wallet balance
async function initWallet() {
  try {
    const res = await apiRequest('/wallets/primary');
    userWallet = res.data;
    const balanceNum = parseFloat(userWallet.balance);
    balanceHint.textContent = `Available: ₹${balanceNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    if (balanceNum <= 0) {
      balanceHint.innerHTML = `Available: <span class="text-error font-bold">₹0.00</span> — <a href="add-money.html" style="color: var(--color-primary); text-decoration: underline; font-weight: 600;">Add Money First</a>`;
    }
  } catch (err) {
    showToast('Failed to load wallet: ' + err.message, 'error');
  }
}

// Quick contact click handler
document.querySelectorAll('.quick-contact-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    inputQuery.value = btn.dataset.contact;
    lookupRecipient();
  });
});

// Recipient Lookup
async function lookupRecipient() {
  const query = inputQuery.value.trim();
  if (!query) {
    showToast('Enter recipient mobile, email, or wallet ID.', 'info');
    return;
  }

  btnLookup.disabled = true;
  btnLookup.textContent = '...';

  try {
    const res = await apiRequest(`/wallets/lookup?query=${encodeURIComponent(query)}`);
    selectedRecipient = res.data;

    recName.textContent = selectedRecipient.recipient.fullName;
    recMeta.textContent = `${selectedRecipient.recipient.email} • ${selectedRecipient.recipient.phone}`;
    recAvatar.textContent = selectedRecipient.recipient.fullName.split(' ').map(n => n[0]).join('').slice(0, 2);

    previewBox.style.display = 'block';
    amountCard.style.opacity = '1';
    amountCard.style.pointerEvents = 'auto';
    btnSend.disabled = false;
    amountInput.focus();
  } catch (err) {
    selectedRecipient = null;
    previewBox.style.display = 'none';
    amountCard.style.opacity = '0.5';
    amountCard.style.pointerEvents = 'none';
    btnSend.disabled = true;
    showToast(err.message, 'error');
  } finally {
    btnLookup.disabled = false;
    btnLookup.textContent = 'Find';
  }
}

btnLookup.addEventListener('click', lookupRecipient);
inputQuery.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') lookupRecipient();
});

// Amount quick chips
document.querySelectorAll('.amount-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const chipVal = parseFloat(chip.dataset.amount);
    const currentVal = parseFloat(amountInput.value) || 0;
    amountInput.value = currentVal + chipVal;
  });
});

// Transfer Execution
btnSend.addEventListener('click', async () => {
  const amount = parseFloat(amountInput.value);

  if (!selectedRecipient) {
    showToast('Please search and verify a recipient first.', 'error');
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount greater than ₹0.00', 'error');
    return;
  }

  if (amount > parseFloat(userWallet.balance)) {
    showToast(`Insufficient balance (Available: ₹${parseFloat(userWallet.balance).toFixed(2)}). Please Add Money first!`, 'error');
    return;
  }

  btnSend.disabled = true;
  btnSend.classList.add('btn-loading');

  // Unique Idempotency Key
  const idempotencyKey = generateUUID();

  try {
    const response = await apiRequest('/transfers', {
      method: 'POST',
      headers: {
        'x-idempotency-key': idempotencyKey
      },
      body: JSON.stringify({
        receiverWalletId: selectedRecipient.wallet.id,
        amount: amount.toFixed(2),
        currency: 'INR'
      })
    });

    const tx = response.data.transaction;

    // Show Digital Receipt
    receiptAmount.textContent = `₹ ${parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    receiptReceiverName.textContent = selectedRecipient.recipient.fullName;
    receiptUtr.textContent = tx.reference;
    receiptTime.textContent = formatTransactionDate(tx.completedAt);

    flowContainer.style.display = 'none';
    receiptContainer.style.display = 'block';

    showToast('Payment successful!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
    btnSend.disabled = false;
    btnSend.classList.remove('btn-loading');
  }
});

initWallet();
