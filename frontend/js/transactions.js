/**
 * PayBuddy Premium Transactions & Ledger Audit Controller
 */

import { apiRequest } from './api.js';
import { requireAuth } from './auth.js';
import { formatTransactionDate, showToast, copyToClipboard } from './utils.js';

requireAuth();

const searchInput = document.getElementById('tx-search-input');
const filterTabs = document.querySelectorAll('.filter-tab');
const container = document.getElementById('history-container');

// Modal Elements
const modal = document.getElementById('receipt-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalStatusBadge = document.getElementById('modal-status-badge');
const modalAmount = document.getElementById('modal-amount');
const modalUtr = document.getElementById('modal-utr');
const modalSender = document.getElementById('modal-sender');
const modalReceiver = document.getElementById('modal-receiver');
const modalTimestamp = document.getElementById('modal-timestamp');
const modalType = document.getElementById('modal-type');
const modalLedgerEntries = document.getElementById('modal-ledger-entries');
const btnCopyUtrModal = document.getElementById('btn-copy-utr-modal');

let allTransactions = [];
let activeFilter = 'ALL';
let activeUtr = '';

async function loadTransactions() {
  try {
    const res = await apiRequest('/transactions?limit=100');
    allTransactions = res.data || [];
    renderList();
  } catch (err) {
    container.innerHTML = `<div class="text-center py-6 text-error text-sm">Failed to load transactions.</div>`;
  }
}

function renderList() {
  const searchTerm = searchInput.value.toLowerCase().trim();

  const filtered = allTransactions.filter(tx => {
    // 1. Tab filter
    if (activeFilter === 'CREDIT' && tx.direction !== 'CREDIT') return false;
    if (activeFilter === 'DEBIT' && tx.direction !== 'DEBIT') return false;
    if (activeFilter === 'TOPUP' && tx.type !== 'WALLET_FUNDING') return false;

    // 2. Search query filter
    if (searchTerm) {
      const matchName = tx.counterparty.toLowerCase().includes(searchTerm);
      const matchRef = (tx.reference || '').toLowerCase().includes(searchTerm);
      const matchAmount = String(tx.amount).includes(searchTerm);
      if (!matchName && !matchRef && !matchAmount) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-muted text-sm">
        No matching transactions found.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((tx, idx) => {
    const isCredit = tx.direction === 'CREDIT';
    const amountFormatted = `${isCredit ? '+' : '-'} ₹ ${parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const avatarLetters = tx.counterparty.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'TX';

    return `
      <div class="transaction-item stagger-item" style="animation-delay: ${Math.min(idx * 30, 300)}ms;" data-id="${tx.id}">
        <div class="flex items-center gap-3">
          <div class="transaction-avatar" style="${isCredit ? 'background-color: var(--color-success-light); color: var(--color-success);' : ''}">${avatarLetters}</div>
          <div>
            <div class="text-sm font-semibold text-primary">${tx.counterparty}</div>
            <div class="text-2xs text-secondary mt-1">${formatTransactionDate(tx.createdAt)} • ${tx.reference || 'UTR-N/A'}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="${isCredit ? 'transaction-credit' : 'transaction-debit'}">${amountFormatted}</div>
          <span class="badge ${tx.status === 'SUCCESS' ? 'badge-success' : 'badge-error'}">${tx.status}</span>
        </div>
      </div>
    `;
  }).join('');

  // Attach click listeners to open receipt modal
  container.querySelectorAll('.transaction-item').forEach(item => {
    item.addEventListener('click', () => {
      openReceiptModal(item.dataset.id);
    });
  });
}

// Open and populate receipt modal
async function openReceiptModal(txId) {
  modal.style.display = 'flex';
  modalAmount.textContent = 'Loading...';
  modalLedgerEntries.innerHTML = '<div class="text-2xs text-muted">Auditing journal records...</div>';

  try {
    const res = await apiRequest(`/transactions/${txId}`);
    const tx = res.data;

    activeUtr = tx.reference;
    const isCredit = tx.direction === 'CREDIT';

    modalStatusBadge.textContent = tx.status;
    modalStatusBadge.className = `badge ${tx.status === 'SUCCESS' ? 'badge-success' : 'badge-error'}`;
    modalAmount.textContent = `${isCredit ? '+' : '-'} ₹ ${parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    modalAmount.style.color = isCredit ? 'var(--color-success)' : 'var(--color-text-primary)';
    modalUtr.textContent = `Reference: ${tx.reference}`;

    modalSender.textContent = `${tx.sender.name} (${tx.sender.phone})`;
    modalReceiver.textContent = `${tx.receiver.name} (${tx.receiver.phone})`;
    modalTimestamp.textContent = formatTransactionDate(tx.completedAt || tx.createdAt);
    modalType.textContent = tx.type === 'WALLET_FUNDING' ? 'Simulated Bank Top-Up' : 'P2P Instant Transfer';

    // Populate Double-Entry Ledger Records
    if (tx.ledgerAudit && tx.ledgerAudit.length > 0) {
      modalLedgerEntries.innerHTML = tx.ledgerAudit.map(entry => `
        <div class="ledger-entry-card flex justify-between items-center">
          <div>
            <span class="font-bold ${entry.entryType === 'CREDIT' ? 'text-success' : 'text-primary'}">${entry.entryType}</span>
            <span class="text-2xs font-mono text-muted">(${entry.walletId.slice(0, 16)}...)</span>
          </div>
          <div class="font-bold tabular-nums">₹ ${parseFloat(entry.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
      `).join('');
    } else {
      modalLedgerEntries.innerHTML = '<div class="text-2xs text-muted">No journal entries found.</div>';
    }
  } catch (err) {
    showToast('Failed to load transaction details: ' + err.message, 'error');
    modal.style.display = 'none';
  }
}

btnCloseModal?.addEventListener('click', () => {
  modal.style.display = 'none';
});

modal?.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

btnCopyUtrModal?.addEventListener('click', () => {
  if (activeUtr) {
    copyToClipboard(activeUtr, 'Reference UTR copied to clipboard!');
  }
});

// Filter tab clicks
filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.filter;
    renderList();
  });
});

searchInput?.addEventListener('input', renderList);

loadTransactions();
