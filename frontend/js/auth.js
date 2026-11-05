/**
 * PayBuddy Client-Side Authentication State Manager
 */

export function saveSession({ user, wallet, tokens }) {
  if (tokens?.accessToken) {
    localStorage.setItem('paybuddy_access_token', tokens.accessToken);
  }
  if (tokens?.refreshToken) {
    localStorage.setItem('paybuddy_refresh_token', tokens.refreshToken);
  }
  if (user) {
    localStorage.setItem('paybuddy_user', JSON.stringify(user));
  }
  if (wallet) {
    localStorage.setItem('paybuddy_wallet', JSON.stringify(wallet));
  }
}

export function getCurrentUser() {
  const user = localStorage.getItem('paybuddy_user');
  return user ? JSON.parse(user) : null;
}

export function getCurrentWallet() {
  const wallet = localStorage.getItem('paybuddy_wallet');
  return wallet ? JSON.parse(wallet) : null;
}

export function isAuthenticated() {
  return !!localStorage.getItem('paybuddy_access_token');
}

export function clearSession() {
  localStorage.removeItem('paybuddy_access_token');
  localStorage.removeItem('paybuddy_refresh_token');
  localStorage.removeItem('paybuddy_user');
  localStorage.removeItem('paybuddy_wallet');
  window.location.href = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
}

/**
 * Route Guard: Protect private pages
 */
export function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
  }
}

/**
 * Route Guard: Prevent authenticated users from accessing login/register
 */
export function requireGuest() {
  if (isAuthenticated()) {
    window.location.href = window.location.pathname.includes('/pages/') ? 'dashboard.html' : 'pages/dashboard.html';
  }
}
