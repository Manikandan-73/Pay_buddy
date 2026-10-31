/**
 * PayBuddy Frontend Utility Helpers
 * Native ES6+ functions for formatting, currency, idempotency, and DOM helpers
 */

/**
 * Format monetary amount with Indian Rupee symbol and standard grouping
 * Example: 10000.5 -> "₹ 10,000.50"
 */
export function formatINR(amount) {
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(numeric)) return '₹ 0.00';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numeric);
}

/**
 * Parse monetary input into clean minor units (paise) to eliminate floating point issues
 * Example: "250.50" -> 25050
 */
export function toPaise(rupeesString) {
  const clean = String(rupeesString).replace(/[^0-9.]/g, '');
  const [whole = '0', fraction = '00'] = clean.split('.');
  const paddedFraction = (fraction + '00').slice(0, 2);
  return parseInt(whole, 10) * 100 + parseInt(paddedFraction, 10);
}

/**
 * Convert paise back to standard decimal string
 * Example: 25050 -> "250.50"
 */
export function paiseToRupeesString(paise) {
  return (paise / 100).toFixed(2);
}

/**
 * Generate cryptographic standard UUID v4 for the x-idempotency-key header
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format ISO Timestamp to readable local format
 * Example: "Today, 04:15 PM" or "31 Oct 2026, 07:00 PM"
 */
export function formatTransactionDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  if (isToday) {
    return `Today, ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return `${dateStr}, ${timeStr}`;
}

/**
 * Display a temporary non-blocking toast message
 */
export function showToast(message, type = 'info', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') toast.style.backgroundColor = 'var(--color-error)';
  if (type === 'success') toast.style.backgroundColor = 'var(--color-success)';
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}
