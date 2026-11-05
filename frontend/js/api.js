/**
 * PayBuddy Centralized API Client
 * Automatically handles JWT Bearer tokens, error toasts, and idempotency keys
 */

import { generateUUID, showToast } from './utils.js';

export const API_BASE_URL = 'http://localhost:5000/api/v1';

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('paybuddy_access_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(options.headers || {})
  };

  // Automatically attach x-idempotency-key for mutating requests if not provided
  if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
    if (!headers['x-idempotency-key']) {
      headers['x-idempotency-key'] = generateUUID();
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    // Handle session expiry
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('paybuddy_access_token');
      localStorage.removeItem('paybuddy_user');
      showToast('Your session has expired. Please log in again.', 'error');
      setTimeout(() => {
        window.location.href = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
      }, 1000);
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorMsg = data?.error?.message || 'A network error occurred. Please try again.';
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      showToast('Cannot connect to backend server. Ensure backend is running on port 5000.', 'error');
    }
    throw err;
  }
}
