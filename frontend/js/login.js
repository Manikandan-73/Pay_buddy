/**
 * Login Page Controller
 */

import { apiRequest } from './api.js';
import { saveSession, requireGuest } from './auth.js';
import { showToast } from './utils.js';

// Redirect if already logged in
requireGuest();

const form = document.getElementById('login-form');
const btnSubmit = document.getElementById('btn-submit');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// Quick Demo Fills
document.getElementById('fill-alice')?.addEventListener('click', () => {
  emailInput.value = 'alice@paybuddy.local';
  passwordInput.value = 'Password@123';
});

document.getElementById('fill-bob')?.addEventListener('click', () => {
  emailInput.value = 'bob@paybuddy.local';
  passwordInput.value = 'Password@123';
});

document.getElementById('fill-charlie')?.addEventListener('click', () => {
  emailInput.value = 'charlie@paybuddy.local';
  passwordInput.value = 'Password@123';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showToast('Please enter both email and password.', 'error');
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.classList.add('btn-loading');

  try {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    saveSession(response.data);
    showToast('Login successful! Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.classList.remove('btn-loading');
  }
});
