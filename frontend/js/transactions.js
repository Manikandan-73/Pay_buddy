/**
 * Transaction History & Digital Receipt Controller
 */

import { apiRequest } from './api.js';
import { requireAuth } from './auth.js';
import { formatINR, formatTransactionDate, showToast } from './utils.js';

requireAuth();

const historyContainer = document.getElementById('history-container');
const filterTabs = document.querySelectorAll('.filter-tab');

// Modal Elements
const modal = document.getElementById('receipt-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalAmount = document.getElementById('modal-amount');
const modalStatus = document.getElementById('modal-status-badge');
const modalUtr = document.getElementById('modal-utr');
const modalSender = document.getElementById('modal-sender');
const modalReceiver = document.getElementById('modal-receiver');
const modalTimestamp = document.getElementById('modal-timestamp');
const modalType = document.getElementById('modal-type');
const modalLedgerEntries = document.getElementById('modal-ledger-entries');

let allTransactions = [];
let activeFilter = 'ALL';

async function fetchTransactions() {
  try {
    const res = await apiRequest('/transactions?limit=50');
    allTransactions = res.data || [];
    renderTransactions();
  } catch (err) {
    historyContainer.innerHTML = `<div class="text-center py-6 text-error text-sm">Failed to load transactions.</div>`;
  }
}

function renderTransactions() {
  let filtered = allTransactions;

  if (activeFilter === 'CREDIT') {
    filtered = allTransactions.filter(t => t.direction === 'CREDIT');
  } else if (activeFilter === 'DEBIT') {
    filtered = allTransactions.filter(t => t.direction === 'DEBIT');
  } else if (activeFilter === 'TOPUP') {
    filtered = allTransactions.filter(t => t.type === 'WALLET_FUNDING');
  }

  if (filtered.length === 0) {
    historyContainer.innerHTML = `<div class="text-center py-8 text-muted text-sm">No transactions found for this filter.</div>`;
    return;
  }

  historyContainer.innerHTML = filtered.map(tx => {
    const isCredit = tx.direction === 'CREDIT';
    const amountStr = `${isCredit ? '+' : '-'} ₹ ${parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const initials = tx.counterparty.split(' ').map(n => n[0]).join('').slice(0, 2) || 'TX';

    return `
      <div class="transaction-item" data-id="${tx.id}">
        <div class="flex items-center gap-3">
          <div class="transaction-avatar" style="${isCredit ? 'color: var(--color-success);' : ''}">${initials}</div>
          <div>
            <div class="text-sm font-semibold">${tx.counterparty}</div>
            <div class="text-xs text-muted">${formatTransactionDate(tx.createdAt)} • <span class="font-mono">${tx.reference}</span></div>
          </div>
        </div>
        <div class="text-right">
          <div class="${isCredit ? 'transaction-credit' : 'transaction-debit'}">${amountStr}</div>
          <span class="badge ${tx.status === 'SUCCESS' ? 'badge-success' : 'badge-error'}">${tx.status}</span>
        </div>
      </div>
    `;
  }).join('');

  // Attach click listeners to open receipt modal
  document.querySelectorAll('.transaction-item').forEach(item => {
    item.addEventListener('click', () => {
      openReceiptModal(item.dataset.id);
    });
  });
}

async function openReceiptModal(txId) {
  try {
    const res = await apiRequest(`/transactions/${txId}`);
    const tx = res.data;

    modalAmount.textContent = `₹ ${parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    modalAmount.style.color = tx.direction === 'CREDIT' ? 'var(--color-success)' : 'var(--color-text-primary)';
    modalStatus.innerHTML = `<span class="badge ${tx.status === 'SUCCESS' ? 'badge-success' : 'badge-error'}">${tx.status}</span>`;
    modalUtr.textContent = `Reference UTR: ${tx.reference}`;
    modalSender.textContent = `${tx.sender.name} (${tx.sender.phone})`;
    modalReceiver.textContent = `${tx.receiver.name} (${tx.receiver.phone})`;
    modalTimestamp.textContent = formatTransactionDate(tx.createdAt);
    modalType.textContent = tx.type;

    // Render Ledger Audit
    if (tx.ledgerAudit && tx.ledgerAudit.length > 0) {
      modalLedgerEntries.innerHTML = tx.ledgerAudit.map(entry => `
        <div class="flex justify-between py-1 px-2" style="background: var(--color-surface); border-radius: 4px; border: 1px solid var(--color-border);">
          <span class="font-mono text-muted">${entry.entryType}</span>
          <span class="font-mono font-semibold">₹${parseFloat(entry.amount).toFixed(2)}</span>
          <span class="text-muted">${entry.walletId.slice(0, 10)}...</span>
        </div>
      `).join('');
    } else {
      modalLedgerEntries.innerHTML = `<span class="text-muted">No audit ledger records found.</span>`;
    }

    modal.style.display = 'flex';
  } catch (err) {
    showToast('Failed to load transaction details: ' + err.message, 'error');
  }
}

btnCloseModal.addEventListener('click', () => {
  modal.style.display = 'none';
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.style.display = 'none';
});

// Filter Tabs
filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    renderTransactions();
  });
});

fetchTransactions();
