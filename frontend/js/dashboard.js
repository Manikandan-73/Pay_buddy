/**
 * PayBuddy Premium Dashboard Controller
 * Motion-Driven Fintech Experience with Count-Up Transitions
 */

import { apiRequest } from './api.js';
import { requireAuth, saveSession } from './auth.js';
import { formatINR, formatTransactionDate, showToast, animateCountUp, copyToClipboard } from './utils.js';

requireAuth();

const greetingEl = document.getElementById('user-greeting');
const navUserInitials = document.getElementById('nav-user-initials');
const balanceDisplay = document.getElementById('wallet-balance-display');
const walletIdDisplay = document.getElementById('wallet-id-display');
const walletIdPill = document.getElementById('wallet-id-pill');
const portfolioMainBalance = document.getElementById('portfolio-main-balance');
const portfolioRewardBalance = document.getElementById('portfolio-reward-balance');
const btnRefresh = document.getElementById('btn-refresh-balance');
const btnToggleEye = document.getElementById('btn-toggle-eye');
const eyeIcon = document.getElementById('eye-icon');
const txContainer = document.getElementById('transactions-container');

// Notifications Drawer Elements
const btnNotifications = document.getElementById('btn-notifications');
const notificationsDrawer = document.getElementById('notifications-drawer');
const btnCloseNotifications = document.getElementById('btn-close-notifications');

let rawBalance = '0.00';
let currentWalletId = '';
let isBalanceHidden = sessionStorage.getItem('paybuddy_hide_balance') === 'true';

// Compute Time-of-Day Greeting
function updateGreeting(fullName) {
  const hour = new Date().getHours();
  let timeStr = 'Good morning';
  if (hour >= 12 && hour < 17) timeStr = 'Good afternoon';
  if (hour >= 17) timeStr = 'Good evening';

  const firstName = fullName ? fullName.split(' ')[0] : 'there';
  greetingEl.textContent = `${timeStr}, ${firstName} 👋`;
}

// Update Balance UI with Eye Masking Support
function renderBalance() {
  if (isBalanceHidden) {
    balanceDisplay.textContent = '₹ ••••••';
    if (portfolioMainBalance) portfolioMainBalance.textContent = '₹ ••••••';
    if (portfolioRewardBalance) portfolioRewardBalance.textContent = '₹ ••••••';
    eyeIcon.innerHTML = `
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    `;
  } else {
    animateCountUp(balanceDisplay, rawBalance, 650, '₹ ');
    if (portfolioMainBalance) {
      portfolioMainBalance.textContent = `₹ ${parseFloat(rawBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    if (portfolioRewardBalance) {
      portfolioRewardBalance.textContent = '₹ 150.00';
    }
    eyeIcon.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    `;
  }
}

btnToggleEye?.addEventListener('click', () => {
  isBalanceHidden = !isBalanceHidden;
  sessionStorage.setItem('paybuddy_hide_balance', isBalanceHidden);
  renderBalance();
});

// Copy Wallet ID Pill
walletIdPill?.addEventListener('click', () => {
  if (currentWalletId) {
    copyToClipboard(currentWalletId, 'Primary Wallet ID copied to clipboard!');
  }
});

// Notifications Drawer Listeners
btnNotifications?.addEventListener('click', () => {
  notificationsDrawer.style.setProperty('display', 'flex', 'important');
});

btnCloseNotifications?.addEventListener('click', () => {
  notificationsDrawer.style.setProperty('display', 'none', 'important');
});

notificationsDrawer?.addEventListener('click', (e) => {
  if (e.target === notificationsDrawer) {
    notificationsDrawer.style.setProperty('display', 'none', 'important');
  }
});

async function loadUserData() {
  try {
    const userRes = await apiRequest('/auth/me');
    const user = userRes.data;

    updateGreeting(user.fullName);
    const initials = user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    navUserInitials.textContent = initials;

    if (user.primaryWallet) {
      rawBalance = user.primaryWallet.balance;
      currentWalletId = user.primaryWallet.id;
      walletIdDisplay.textContent = `ID: ${user.primaryWallet.id.slice(0, 16)}...`;
      saveSession({ user, wallet: user.primaryWallet });
      renderBalance();
    }
  } catch (err) {
    showToast('Failed to load profile: ' + err.message, 'error');
  }
}

async function loadRecentTransactions() {
  try {
    const res = await apiRequest('/transactions?limit=5');
    const txs = res.data || [];

    if (txs.length === 0) {
      txContainer.innerHTML = `
        <div class="text-center py-6 text-muted text-sm">
          No transactions yet. Add money or send funds to see activity here.
        </div>
      `;
      return;
    }

    txContainer.innerHTML = txs.map((tx, idx) => {
      const isCredit = tx.direction === 'CREDIT';
      const amountFormatted = `${isCredit ? '+' : '-'} ₹ ${parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const avatarLetters = tx.counterparty.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'TX';

      return `
        <div class="transaction-item stagger-item" style="animation-delay: ${idx * 45}ms;" onclick="window.location.href='transactions.html'">
          <div class="flex items-center gap-3">
            <div class="transaction-avatar" style="${isCredit ? 'background-color: var(--color-success-light); color: var(--color-success);' : ''}">${avatarLetters}</div>
            <div>
              <div class="text-sm font-semibold text-primary">${tx.counterparty}</div>
              <div class="text-2xs text-secondary mt-1">${formatTransactionDate(tx.createdAt)} • ${tx.type === 'WALLET_FUNDING' ? 'Top-Up' : 'P2P Transfer'}</div>
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
    txContainer.innerHTML = `<div class="text-center py-4 text-error text-sm">Unable to load transactions.</div>`;
  }
}

btnRefresh?.addEventListener('click', async () => {
  btnRefresh.style.transform = 'rotate(180deg)';
  btnRefresh.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
  await loadUserData();
  await loadRecentTransactions();
  showToast('Balance updated', 'info');
  setTimeout(() => { btnRefresh.style.transform = 'rotate(0deg)'; }, 450);
});

// Boot Dashboard
loadUserData();
loadRecentTransactions();
