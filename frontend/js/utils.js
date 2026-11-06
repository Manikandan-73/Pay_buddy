/**
 * PayBuddy Frontend Utility Helpers
 * Native ES6+ functions for formatting, currency, idempotency, and motion helpers
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
 * Animate a numeric balance count-up using requestAnimationFrame and ease-out cubic curve
 */
export function animateCountUp(element, targetValue, duration = 650, prefix = '₹ ') {
  if (!element) return;
  const target = parseFloat(targetValue) || 0;
  const start = 0;
  const startTime = performance.now();

  // If reduced motion is requested, render target immediately
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.textContent = `${prefix}${target.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return;
  }

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out cubic: 1 - pow(1 - progress, 3)
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentVal = start + (target - start) * easeProgress;

    element.textContent = `${prefix}${currentVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = `${prefix}${target.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  requestAnimationFrame(update);
}

/**
 * Parse monetary input into clean minor units (paise) to eliminate floating point issues
 */
export function toPaise(rupeesString) {
  const clean = String(rupeesString).replace(/[^0-9.]/g, '');
  const [whole = '0', fraction = '00'] = clean.split('.');
  const paddedFraction = (fraction + '00').slice(0, 2);
  return parseInt(whole, 10) * 100 + parseInt(paddedFraction, 10);
}

/**
 * Convert paise back to standard decimal string
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
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format ISO Timestamp to readable local format
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
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/**
 * Copy text to clipboard with feedback
 */
export async function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMsg, 'success');
  } catch (err) {
    showToast('Failed to copy', 'error');
  }
}
