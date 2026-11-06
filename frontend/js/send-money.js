/**
 * PayBuddy Premium Send Money Controller
 * Multi-Step Guided Checkout with Idempotency & Live Recipient Verification
 */

import { apiRequest } from './api.js';
import { requireAuth } from './auth.js';
import { formatINR, showToast, generateUUID } from './utils.js';

requireAuth();

const queryInput = document.getElementById('recipient-query');
const btnLookup = document.getElementById('btn-lookup');
const previewBox = document.getElementById('recipient-preview-box');
const recAvatar = document.getElementById('rec-avatar');
const recName = document.getElementById('rec-name');
const recMeta = document.getElementById('rec-meta');

const amountCard = document.getElementById('amount-card');
const amountInput = document.getElementById('transfer-amount');
const noteInput = document.getElementById('transfer-note');
const balanceHint = document.getElementById('available-balance-hint');
const btnReviewTransfer = document.getElementById('btn-review-transfer');

// Review Modal Elements
const reviewModal = document.getElementById('review-modal');
const btnCloseReview = document.getElementById('btn-close-review');
const reviewModalAmount = document.getElementById('review-modal-amount');
const reviewModalRecipient = document.getElementById('review-modal-recipient');
const reviewModalWallet = document.getElementById('review-modal-wallet');
const reviewModalTotal = document.getElementById('review-modal-total');
const btnConfirmPay = document.getElementById('btn-confirm-pay');

// Receipt Elements
const transferFlowContainer = document.getElementById('transfer-flow-container');
const receiptContainer = document.getElementById('receipt-container');
const receiptAmount = document.getElementById('receipt-amount');
const receiptReceiverName = document.getElementById('receipt-receiver-name');
const receiptUtr = document.getElementById('receipt-utr');
const receiptTime = document.getElementById('receipt-time');

let verifiedRecipient = null;
let senderBalance = 0;

// 1. Fetch Sender Primary Balance
async function fetchSenderBalance() {
  try {
    const res = await apiRequest('/auth/me');
    if (res.data?.primaryWallet) {
      senderBalance = parseFloat(res.data.primaryWallet.balance) || 0;
      balanceHint.textContent = `Available: ₹ ${senderBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
  } catch (err) {
    balanceHint.textContent = 'Balance unavailable';
  }
}

// 2. Lookup Recipient
async function lookupRecipient(searchKey) {
  const query = searchKey || queryInput.value.trim();
  if (!query) {
    showToast('Enter recipient mobile, email, or name', 'error');
    return;
  }

  btnLookup.disabled = true;
  btnLookup.classList.add('btn-loading');

  try {
    const res = await apiRequest(`/wallets/lookup?query=${encodeURIComponent(query)}`);
    const recipient = res.data;

    verifiedRecipient = recipient;

    // Render Preview Box
    recName.textContent = recipient.fullName;
    recMeta.textContent = `${recipient.email} • ${recipient.phone}`;
    recAvatar.textContent = recipient.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    previewBox.style.display = 'block';

    // Unlock Amount Card
    amountCard.style.opacity = '1';
    amountCard.style.pointerEvents = 'auto';
    amountInput.focus();

    validateReadyToPay();
    showToast(`Recipient verified: ${recipient.fullName}`, 'success');
  } catch (err) {
    verifiedRecipient = null;
    previewBox.style.display = 'none';
    amountCard.style.opacity = '0.5';
    amountCard.style.pointerEvents = 'none';
    btnReviewTransfer.disabled = true;
    showToast(err.message, 'error');
  } finally {
    btnLookup.disabled = false;
    btnLookup.classList.remove('btn-loading');
  }
}

function validateReadyToPay() {
  const amount = parseFloat(amountInput.value);
  const isValid = verifiedRecipient && !isNaN(amount) && amount > 0 && amount <= senderBalance;
  btnReviewTransfer.disabled = !isValid;
}

btnLookup.addEventListener('click', () => lookupRecipient());
queryInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') lookupRecipient();
});

// Amount quick chips
document.querySelectorAll('.amount-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const chipVal = parseFloat(chip.dataset.amount);
    const currentVal = parseFloat(amountInput.value) || 0;
    amountInput.value = currentVal + chipVal;
    validateReadyToPay();
  });
});

amountInput.addEventListener('input', validateReadyToPay);

// Quick suggested contact buttons
document.querySelectorAll('.quick-contact-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    queryInput.value = btn.dataset.contact;
    lookupRecipient(btn.dataset.contact);
  });
});

// 3. Open Review Confirmation Modal
btnReviewTransfer.addEventListener('click', () => {
  const amount = parseFloat(amountInput.value);
  if (!verifiedRecipient || isNaN(amount) || amount <= 0) return;

  if (amount > senderBalance) {
    showToast(`Insufficient balance. Maximum available: ₹ ${senderBalance.toFixed(2)}`, 'error');
    return;
  }

  reviewModalAmount.textContent = `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  reviewModalRecipient.textContent = `${verifiedRecipient.fullName} (${verifiedRecipient.email})`;
  reviewModalWallet.textContent = verifiedRecipient.walletId;
  reviewModalTotal.textContent = `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  reviewModal.style.display = 'flex';
});

btnCloseReview.addEventListener('click', () => {
  reviewModal.style.display = 'none';
});

reviewModal.addEventListener('click', (e) => {
  if (e.target === reviewModal) {
    reviewModal.style.display = 'none';
  }
});

// 4. Confirm & Execute Transfer
btnConfirmPay.addEventListener('click', async () => {
  const amount = parseFloat(amountInput.value);
  const note = noteInput?.value.trim() || undefined;

  btnConfirmPay.disabled = true;
  btnConfirmPay.classList.add('btn-loading');

  const idempotencyKey = generateUUID();

  try {
    const res = await apiRequest('/transfers', {
      method: 'POST',
      headers: {
        'x-idempotency-key': idempotencyKey
      },
      body: JSON.stringify({
        receiverWalletId: verifiedRecipient.walletId,
        amount: amount.toFixed(2),
        ...(note && { description: note })
      })
    });

    const tx = res.data;

    // Hide Review Modal & Transfer Form
    reviewModal.style.display = 'none';
    transferFlowContainer.style.display = 'none';

    // Populate Success Receipt
    receiptAmount.textContent = `₹ ${parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    receiptReceiverName.textContent = verifiedRecipient.fullName;
    receiptUtr.textContent = tx.reference || 'UTR-PENDING';
    receiptTime.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    receiptContainer.style.display = 'block';
    showToast('Payment confirmed & reconciled!', 'success');
  } catch (err) {
    showToast('Transfer failed: ' + err.message, 'error');
  } finally {
    btnConfirmPay.disabled = false;
    btnConfirmPay.classList.remove('btn-loading');
  }
});

// 5. Check URL parameters for direct recipient pre-fill
const urlParams = new URLSearchParams(window.location.search);
const recipientParam = urlParams.get('recipient');
if (recipientParam) {
  queryInput.value = recipientParam;
  lookupRecipient(recipientParam);
}

fetchSenderBalance();
