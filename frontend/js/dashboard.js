/**
 * Dashboard Page Controller
 */

import { apiRequest } from './api.js';
import { requireAuth, getCurrentUser, saveSession } from './auth.js';
import { formatINR, formatTransactionDate, showToast } from './utils.js';

requireAuth();

const navUserName = document.getElementById('nav-user-name');
const navUserInitials = document.getElementById('nav-user-initials');
const balanceDisplay = document.getElementById('wallet-balance-display');
const walletIdDisplay = document.getElementById('wallet-id-display');
const btnRefresh = document.getElementById('btn-refresh-balance');
const txContainer = document.getElementById('transactions-container');

async function loadUserData() {
  try {
    const userRes = await apiRequest('/auth/me');
    const user = userRes.data;

    navUserName.textContent = user.fullName;
    const initials = user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    navUserInitials.textContent = initials;

    if (user.primaryWallet) {
      balanceDisplay.innerHTML = `<span class="wallet-balance-currency">₹</span> ${parseFloat(user.primaryWallet.balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      walletIdDisplay.textContent = `Wallet: ${user.primaryWallet.id}`;
      saveSession({ user, wallet: user.primaryWallet });
    }
  } catch (err) {
    showToast('Failed to load user profile: ' + err.message, 'error');
  }
}

async function loadRecentTransactions() {
  try {
    const res = await apiRequest('/transactions?limit=5');
    const txs = res.data || [];

    if (txs.length === 0) {
      txContainer.innerHTML = `
        <div class="text-center py-6 text-muted text-sm">
          No transactions yet. Add money or send funds to get started!
        </div>
      `;
      return;
    }

    txContainer.innerHTML = txs.map(tx => {
      const isCredit = tx.direction === 'CREDIT';
      const amountFormatted = `${isCredit ? '+' : '-'} ₹ ${parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const avatarLetters = tx.counterparty.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'TX';

      return `
        <div class="transaction-item" onclick="window.location.href='transactions.html'">
          <div class="flex items-center gap-3">
            <div class="transaction-avatar" style="${isCredit ? 'color: var(--color-success);' : ''}">${avatarLetters}</div>
            <div>
              <div class="text-sm font-semibold">${tx.counterparty}</div>
              <div class="text-xs text-muted">${formatTransactionDate(tx.createdAt)} • ${tx.type === 'WALLET_FUNDING' ? 'Top-up' : 'Transfer'}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="${isCredit ? 'transaction-credit' : 'transaction-debit'}">${amountFormatted}</div>
            <span class="badge ${tx.status === 'SUCCESS' ? 'badge-success' : 'badge-error'}">${tx.status}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    txContainer.innerHTML = `<div class="text-center py-4 text-error text-sm">Could not load transactions.</div>`;
  }
}

btnRefresh?.addEventListener('click', async () => {
  btnRefresh.style.transform = 'rotate(180deg)';
  btnRefresh.style.transition = 'transform 0.4s ease';
  await loadUserData();
  await loadRecentTransactions();
  showToast('Balance updated', 'info');
  setTimeout(() => { btnRefresh.style.transform = 'rotate(0deg)'; }, 400);
});

// Initial boot
loadUserData();
loadRecentTransactions();
